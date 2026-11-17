import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { defaultMessage, formatEuros } from '../../shared/billing.js'
import { renderInvoicePdf, type InvoiceForPdf } from '../../server/billing/pdf.js'
import { invoicePdf, sendInvoice, sendReminder, type Mailer } from '../../server/billing/service.js'
import { createFakeDb } from './fake-db.js'

const snapshot: InvoiceForPdf['snapshot'] = {
  organization: { name: 'Cabinet Démo', legal_name: null, siret: '12345678900012', address: '1 rue de l’Exemple\n67000 Strasbourg',
    vat_mention: 'TVA non applicable, article 261-4-1° du CGI', footer: 'Membre d’une association agréée.' },
  practitioner: { first_name: 'Alice', last_name: 'Martin', adeli: '679912345' },
  patient: { first_name: 'Jeanne', last_name: 'Fictive', address: '2 avenue Imaginaire', email: 'jeanne@exemple.fr' },
}

const invoice = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'inv-1', organization_id: 'org', patient_id: 'pat', kind: 'invoice', number: '2026-0007',
  label: 'Séance d’ostéopathie', service_date: '2026-11-17', issue_date: '2026-11-17', amount_cents: 6000,
  status: 'paid', payment_method: 'card', paid_at: '2026-11-17T10:00:00Z', snapshot, credit_for: null, ...over,
})

function seed(inv = invoice(), patient: Record<string, unknown> = { id: 'pat', email: 'jeanne@exemple.fr', consent_email: true }) {
  return createFakeDb({
    invoices: [inv],
    patients: [patient],
    practitioners: [{ organization_id: 'org', user_id: 'u1', first_name: 'Alice', last_name: 'Martin', doctolib_url: null }],
    organizations: [{ id: 'org', message_signature: 'Alice Martin, ostéopathe' }],
    patient_reminders: [{ id: 'rem-1', organization_id: 'org', patient_id: 'pat', kind: 'follow_up', status: 'pending', consultation_id: null }],
  })
}

function withAuth(db: ReturnType<typeof seed>) {
  db.client.auth = { getUser: async () => ({ data: { user: { email: 'alice@cabinet.fr' } } }) }
  return db
}

function captureMailer() {
  const sent: Parameters<Mailer>[0][] = []
  const mailer: Mailer = async (m) => { sent.push(m) }
  return { sent, mailer }
}

describe('PDF de facture', () => {
  it('produit un PDF valide avec les mentions et accents', async () => {
    const bytes = await renderInvoicePdf(invoice() as unknown as InvoiceForPdf)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe('Facture 2026-0007')
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('refuse un brouillon', async () => {
    const db = seed(invoice({ status: 'draft', number: null, snapshot: null }))
    await expect(invoicePdf(db.client, 'inv-1')).rejects.toMatchObject({ status: 409 })
  })
})

describe('envoi', () => {
  it('envoie la facture en pièce jointe et note la date d’envoi', async () => {
    const db = withAuth(seed())
    const { sent, mailer } = captureMailer()
    await sendInvoice(db.client, 'u1', 'inv-1', mailer)
    expect(sent[0]).toMatchObject({ to: 'jeanne@exemple.fr', subject: 'Facture n° 2026-0007', replyTo: 'alice@cabinet.fr' })
    expect(sent[0]!.attachments![0]!.filename).toBe('facture-2026-0007.pdf')
    expect(sent[0]!.text).toContain('Alice Martin, ostéopathe')
    expect(db.tables.invoices![0]!.sent_at).toBeTruthy()
  })

  it('refuse une relance sans consentement e-mail', async () => {
    const db = withAuth(seed(invoice(), { id: 'pat', email: 'jeanne@exemple.fr', consent_email: false }))
    const { sent, mailer } = captureMailer()
    await expect(sendReminder(db.client, 'u1', 'rem-1', { subject: 's', body: 'b' }, mailer))
      .rejects.toMatchObject({ status: 422 })
    expect(sent).toHaveLength(0)
  })

  it('envoie une relance validée et la marque envoyée', async () => {
    const db = withAuth(seed())
    const { sent, mailer } = captureMailer()
    await sendReminder(db.client, 'u1', 'rem-1', { subject: 'Suite à votre séance', body: 'Bonjour Jeanne' }, mailer)
    expect(sent[0]).toMatchObject({ to: 'jeanne@exemple.fr', text: 'Bonjour Jeanne' })
    expect(db.tables.patient_reminders![0]).toMatchObject({ status: 'sent', message: 'Bonjour Jeanne' })
    await expect(sendReminder(db.client, 'u1', 'rem-1', { subject: 's', body: 'b' }, mailer)).rejects.toMatchObject({ status: 409 })
  })

  it('sans configuration e-mail, explique quoi faire au lieu d’échouer silencieusement', async () => {
    const { resendMailer } = await import('../../server/billing/service.js')
    delete process.env.RESEND_API_KEY
    await expect(resendMailer({ to: 'a@b.fr', subject: 's', text: 't' })).rejects.toMatchObject({ status: 503 })
  })
})

describe('messages par défaut', () => {
  it('restent sobres : vouvoiement, aucune information médicale', () => {
    const m = defaultMessage('follow_up', { patientFirstName: 'Jeanne', practitionerName: 'Alice Martin', lastVisitDate: '2026-11-17' })
    expect(m.body).toContain('17/11/2026')
    expect(m.body).toMatch(/vous/)
    expect(m.body).not.toMatch(/douleur|lombalgie|diagnostic/i)
  })

  it('rappelle le montant d’une facture impayée', () => {
    const m = defaultMessage('unpaid_invoice', { patientFirstName: 'Jeanne', practitionerName: 'Alice', invoiceNumber: '2026-0007', invoiceAmountCents: 6000, invoiceDate: '2026-11-01' })
    expect(m.body).toContain(formatEuros(6000))
    expect(m.subject).toBe('Facture n° 2026-0007')
  })
})
