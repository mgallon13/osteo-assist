// Facturation et relances côté serveur : PDF, envoi d'e-mails.
// Toutes les lectures et écritures passent par le client utilisateur (RLS).
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { defaultMessage, formatDateFr, type ReminderKind } from '../../shared/billing.js'
import { HttpError } from '../http.js'
import { renderInvoicePdf, type InvoiceForPdf } from './pdf.js'

/** Envoi d'e-mail injectable (tests). */
export type Mailer = (mail: {
  to: string; subject: string; text: string; replyTo?: string
  attachments?: { filename: string; content: Uint8Array }[]
}) => Promise<void>

export const resendMailer: Mailer = async (mail) => {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) {
    throw new HttpError(503, 'L’envoi d’e-mails n’est pas encore configuré. Téléchargez le PDF ou copiez le message en attendant.')
  }
  const resend = new Resend(key)
  const { error } = await resend.emails.send({
    from, to: mail.to, subject: mail.subject, text: mail.text, replyTo: mail.replyTo,
    attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })),
  })
  if (error) {
    console.error('[email]', error.name, error.message)
    throw new HttpError(502, 'L’e-mail n’a pas pu être envoyé. Réessayez plus tard.')
  }
}

interface InvoiceRow extends Omit<InvoiceForPdf, 'credit_for_number'> {
  id: string
  organization_id: string
  patient_id: string
  credit_for: string | null
}

async function loadInvoice(db: SupabaseClient, id: string): Promise<InvoiceForPdf & { id: string; organization_id: string; patient_id: string }> {
  const { data, error } = await db.from('invoices')
    .select('id, organization_id, patient_id, kind, number, label, service_date, issue_date, amount_cents, status, payment_method, paid_at, snapshot, credit_for')
    .eq('id', id).maybeSingle<InvoiceRow>()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Facture introuvable')
  if (data.status === 'draft' || !data.number || !data.snapshot) throw new HttpError(409, 'Émettez la facture avant de la télécharger.')
  let creditForNumber: string | null = null
  if (data.credit_for) {
    const { data: orig } = await db.from('invoices').select('number').eq('id', data.credit_for).maybeSingle<{ number: string }>()
    creditForNumber = orig?.number ?? null
  }
  return { ...data, credit_for_number: creditForNumber }
}

export async function invoicePdf(db: SupabaseClient, invoiceId: string) {
  const inv = await loadInvoice(db, invoiceId)
  const bytes = await renderInvoicePdf(inv)
  const filename = `${inv.kind === 'credit_note' ? 'avoir' : 'facture'}-${inv.number}.pdf`
  return { bytes, filename, invoice: inv }
}

async function practitionerContact(db: SupabaseClient, organizationId: string, userId: string) {
  const [{ data: pr }, { data: org }, { data: user }] = await Promise.all([
    db.from('practitioners').select('first_name, last_name, doctolib_url').eq('organization_id', organizationId)
      .eq('user_id', userId).maybeSingle<{ first_name: string; last_name: string; doctolib_url: string | null }>(),
    db.from('organizations').select('message_signature').eq('id', organizationId).maybeSingle<{ message_signature: string | null }>(),
    db.auth.getUser(),
  ])
  return {
    name: pr ? `${pr.first_name} ${pr.last_name}` : '',
    doctolibUrl: pr?.doctolib_url ?? null,
    signature: org?.message_signature ?? null,
    replyTo: user.user?.email ?? undefined,
  }
}

export async function sendInvoice(db: SupabaseClient, userId: string, invoiceId: string, mailer: Mailer) {
  const { bytes, filename, invoice } = await invoicePdf(db, invoiceId)
  const to = invoice.snapshot.patient.email
  if (!to) throw new HttpError(422, 'Aucune adresse e-mail pour ce patient.')
  const me = await practitionerContact(db, invoice.organization_id, userId)
  const isCredit = invoice.kind === 'credit_note'
  await mailer({
    to,
    replyTo: me.replyTo,
    subject: `${isCredit ? 'Avoir' : 'Facture'} n° ${invoice.number}`,
    text: `Bonjour ${invoice.snapshot.patient.first_name},\n\nVeuillez trouver ci-joint ${isCredit ? 'l’avoir' : 'la facture'} n° ${invoice.number} du ${formatDateFr(invoice.issue_date)}.\n\nBonne journée,\n${me.signature?.trim() || me.name}`,
    attachments: [{ filename, content: bytes }],
  })
  const { error } = await db.from('invoices').update({ sent_at: new Date().toISOString() }).eq('id', invoiceId)
  if (error) throw error
  return { sentTo: to }
}

interface ReminderRow {
  id: string
  organization_id: string
  patient_id: string
  kind: ReminderKind
  status: string
  consultation_id: string | null
}

/**
 * Envoi d'une relance validée par le praticien. Vérifie le consentement e-mail du
 * patient ; aucune information médicale n'est ajoutée au message.
 */
export async function sendReminder(db: SupabaseClient, userId: string, reminderId: string,
  input: { subject: string; body: string }, mailer: Mailer) {
  const { data: rem, error } = await db.from('patient_reminders').select('id, organization_id, patient_id, kind, status, consultation_id')
    .eq('id', reminderId).maybeSingle<ReminderRow>()
  if (error) throw error
  if (!rem) throw new HttpError(404, 'Relance introuvable')
  if (rem.status !== 'pending') throw new HttpError(409, 'Cette relance a déjà été traitée.')

  const { data: patient, error: pErr } = await db.from('patients').select('email, consent_email')
    .eq('id', rem.patient_id).maybeSingle<{ email: string | null; consent_email: boolean }>()
  if (pErr) throw pErr
  if (!patient?.email) throw new HttpError(422, 'Aucune adresse e-mail pour ce patient.')
  if (!patient.consent_email) throw new HttpError(422, 'Le patient n’a pas donné son accord pour être recontacté par e-mail.')

  const me = await practitionerContact(db, rem.organization_id, userId)
  await mailer({ to: patient.email, replyTo: me.replyTo, subject: input.subject, text: input.body })

  const { error: uErr } = await db.from('patient_reminders').update({
    status: 'sent', sent_at: new Date().toISOString(), message: input.body, channel: 'email', handled_by: userId,
  }).eq('id', reminderId)
  if (uErr) throw uErr
  return { sentTo: patient.email }
}

export { defaultMessage }
