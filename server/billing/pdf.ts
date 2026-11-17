// Note d'honoraires (ou avoir) au format habituel des ostéopathes, à partir de l'instantané figé à l'émission.
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { formatDateFr, formatEuros, paymentMethodLabels, type PaymentMethod } from '../../shared/billing.js'

export interface InvoiceForPdf {
  kind: 'invoice' | 'credit_note'
  number: string
  label: string
  service_date: string
  issue_date: string
  amount_cents: number
  status: string
  payment_method: PaymentMethod | null
  paid_at: string | null
  credit_for_number?: string | null
  snapshot: {
    organization: {
      name: string; legal_name: string | null; siret: string | null; address: string | null
      vat_mention: string; footer: string | null; invoice_title?: string | null
    }
    practitioner: {
      first_name: string; last_name: string; adeli: string | null
      rpps?: string | null; title?: string | null; diploma?: string | null; phone?: string | null; email?: string | null
    }
    patient: { first_name: string; last_name: string; address: string | null; email: string | null }
  }
}

/** Les polices standard PDF ne couvrent que le jeu WinAnsi : on remplace le reste. */
function safe(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
    .replace(/[^\x20-\x7e -ÿ€°]/g, '')
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\r?\n/).map(safe)) {
    let line = ''
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line)
        line = word
      } else line = next
    }
    out.push(line)
  }
  return out
}

function longDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

function groupSiret(s: string): string {
  const d = s.replace(/\s/g, '')
  return d.length === 14 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : s
}

export async function renderInvoicePdf(inv: InvoiceForPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.1, 0.1, 0.1)
  const muted = rgb(0.4, 0.4, 0.4)
  const left = 60
  const right = 595.28 - 60
  const width = right - left
  let y = 780

  type Opts = { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> }
  const text = (s: string, x: number, yy: number, o: Opts = {}) =>
    page.drawText(safe(s), { x, y: yy, size: o.size ?? 10.5, font: o.font ?? regular, color: o.color ?? ink })
  const centered = (s: string, yy: number, o: Opts = {}) => {
    const w = (o.font ?? regular).widthOfTextAtSize(safe(s), o.size ?? 10.5)
    text(s, (595.28 - w) / 2, yy, o)
  }
  const rightAligned = (s: string, yy: number, o: Opts = {}) => {
    const w = (o.font ?? regular).widthOfTextAtSize(safe(s), o.size ?? 10.5)
    text(s, right - w, yy, o)
  }
  const block = (lines: (string | null | undefined)[], gapAfter = 12) => {
    for (const l of lines) if (l) for (const w of wrap(l, regular, 10.5, 300)) { text(w, left, y); y -= 13.5 }
    y -= gapAfter
  }

  const { organization: org, practitioner: pr, patient } = inv.snapshot
  const isCredit = inv.kind === 'credit_note'
  const fullName = `${pr.last_name.toUpperCase()} ${pr.first_name.toUpperCase()}`

  // En-tête praticien
  text(fullName, left, y, { font: bold, size: 11 }); y -= 25
  block([(pr.title || 'Ostéopathe D.O.').toUpperCase(), pr.diploma])
  block([org.legal_name && org.legal_name !== fullName ? org.legal_name : null, ...(org.address ?? '').split(/\r?\n/)])
  block([
    org.siret ? `N° SIRET : ${groupSiret(org.siret)}` : null,
    pr.rpps ? `N° RPPS : ${pr.rpps}` : null,
    pr.adeli ? `N° ADELI : ${pr.adeli}` : null,
  ])
  block([pr.phone ? `Téléphone : ${pr.phone}` : null, pr.email ? `E-mail : ${pr.email}` : null], 0)

  // Titre
  y = Math.min(y, 560) - 30
  const title = isCredit ? 'Avoir' : (org.invoice_title || "Note d'honoraires")
  centered(title, y, { font: bold, size: 12 }); y -= 16
  centered(`N° ${inv.number}`, y, { size: 10, color: muted }); y -= 34

  text(`Le ${longDate(inv.issue_date)}`, left + 20, y); y -= 34

  // Corps
  const patientName = `${patient.first_name} ${patient.last_name.toUpperCase()}`
  const amount = formatEuros(Math.abs(inv.amount_cents))
  const body = isCredit
    ? `Avoir de ${amount} au bénéfice de ${patientName}, annulant la facture n° ${inv.credit_for_number ?? ''} (séance du ${formatDateFr(inv.service_date)}).`
    : `${patientName} a reçu une séance de soins ostéopathiques le ${formatDateFr(inv.service_date)} pour un montant de ${amount}.`
  for (const l of wrap(body, regular, 10.5, width)) { text(l, left, y); y -= 14 }
  if (patient.address) for (const l of wrap(`Adresse du patient : ${patient.address.replace(/\r?\n/g, ', ')}`, regular, 9, width)) { text(l, left, y - 2, { size: 9, color: muted }); y -= 12 }
  y -= 22

  if (!isCredit) {
    if (inv.paid_at) {
      const method = inv.payment_method ? ` (${paymentMethodLabels[inv.payment_method].toLowerCase()})` : ''
      text(`FACTURE ACQUITTÉE le ${formatDateFr(inv.paid_at)}${method}`, left, y)
    } else {
      text('Montant à régler à réception.', left, y)
    }
    y -= 18
  }
  if (inv.status === 'cancelled') { text('Facture annulée par avoir.', left, y, { color: rgb(0.7, 0.15, 0.15) }); y -= 18 }

  y -= 40
  if (!isCredit) { text(`Cette ${title.toLowerCase()} tient lieu de facture.`, left, y); y -= 14 }
  text(org.vat_mention, left, y, { size: 9, color: muted }); y -= 14
  text('Cordialement,', left, y); y -= 50
  rightAligned(`${pr.last_name} ${pr.first_name}`, y)

  // Pied de page
  let fy = 50
  for (const l of wrap(org.footer ?? '', regular, 8, width).reverse()) {
    if (l) { text(l, left, fy, { size: 8, color: muted }); fy += 11 }
  }

  doc.setTitle(`${isCredit ? 'Avoir' : title} ${inv.number}`)
  doc.setCreator('OstéoAssist')
  return doc.save()
}
