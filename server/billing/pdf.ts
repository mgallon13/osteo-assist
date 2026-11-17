// Génération du PDF d'une facture (ou d'un avoir) à partir de l'instantané figé à l'émission.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
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
    organization: { name: string; legal_name: string | null; siret: string | null; address: string | null; vat_mention: string; footer: string | null }
    practitioner: { first_name: string; last_name: string; adeli: string | null }
    patient: { first_name: string; last_name: string; address: string | null; email: string | null }
  }
}

/** Les polices standard PDF ne couvrent que le jeu WinAnsi : on remplace le reste. */
function safe(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
    .replace(/[^\x20-\x7e -ÿ€°]/g, '')
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

export async function renderInvoicePdf(inv: InvoiceForPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page: PDFPage = doc.addPage([595.28, 841.89]) // A4
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.11, 0.1, 0.09)
  const muted = rgb(0.42, 0.4, 0.38)
  const accent = rgb(0.06, 0.54, 0.49)
  const left = 56
  const right = 595.28 - 56
  let y = 785

  const text = (s: string, x: number, yy: number, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(safe(s), { x, y: yy, size: opts.size ?? 10, font: opts.font ?? regular, color: opts.color ?? ink })
  const textRight = (s: string, xr: number, yy: number, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const f = opts.font ?? regular
    const size = opts.size ?? 10
    text(s, xr - f.widthOfTextAtSize(safe(s), size), yy, opts)
  }

  const { organization: org, practitioner: pr, patient } = inv.snapshot
  const isCredit = inv.kind === 'credit_note'

  // Émetteur
  text(`${pr.first_name} ${pr.last_name}`, left, y, { font: bold, size: 13 })
  y -= 16
  text('Ostéopathe', left, y, { color: muted })
  y -= 14
  for (const l of wrap(org.legal_name || org.name, regular, 10, 260)) { text(l, left, y); y -= 13 }
  for (const l of wrap(org.address ?? '', regular, 10, 260)) { if (l) { text(l, left, y); y -= 13 } }
  if (pr.adeli) { text(`N° ADELI : ${pr.adeli}`, left, y); y -= 13 }
  if (org.siret) { text(`SIRET : ${org.siret}`, left, y); y -= 13 }

  // Titre
  textRight(isCredit ? 'AVOIR' : 'FACTURE', right, 785, { font: bold, size: 20, color: accent })
  textRight(`N° ${inv.number}`, right, 762, { font: bold, size: 11 })
  textRight(`Date : ${formatDateFr(inv.issue_date)}`, right, 747, { color: muted })
  if (isCredit && inv.credit_for_number) textRight(`Sur facture n° ${inv.credit_for_number}`, right, 733, { color: muted })

  // Patient
  y = Math.min(y, 690) - 20
  text('Patient', left, y, { color: muted, size: 9 })
  y -= 14
  text(`${patient.first_name} ${patient.last_name.toUpperCase()}`, left, y, { font: bold })
  y -= 13
  for (const l of wrap(patient.address ?? '', regular, 10, 260)) { if (l) { text(l, left, y); y -= 13 } }

  // Tableau
  y -= 28
  page.drawRectangle({ x: left, y: y - 6, width: right - left, height: 22, color: rgb(0.96, 0.96, 0.95) })
  text('Désignation', left + 8, y, { font: bold, size: 9 })
  text('Date de la séance', 330, y, { font: bold, size: 9 })
  textRight('Montant', right - 8, y, { font: bold, size: 9 })
  y -= 26
  const labelLines = wrap(inv.label, regular, 10, 250)
  labelLines.forEach((l, i) => text(l, left + 8, y - i * 13))
  text(formatDateFr(inv.service_date), 330, y)
  textRight(formatEuros(inv.amount_cents), right - 8, y)
  y -= Math.max(1, labelLines.length) * 13 + 10
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.84, 0.82) })

  y -= 22
  text('Total', 380, y, { font: bold, size: 11 })
  textRight(formatEuros(inv.amount_cents), right - 8, y, { font: bold, size: 11 })
  y -= 16
  text(org.vat_mention, 380 - 0, y, { size: 8, color: muted })

  // Règlement
  y -= 34
  if (!isCredit) {
    if (inv.paid_at) {
      const method = inv.payment_method ? ` par ${paymentMethodLabels[inv.payment_method].toLowerCase()}` : ''
      text(`Acquittée le ${formatDateFr(inv.paid_at)}${method}.`, left, y, { font: bold })
    } else {
      text('À régler à réception.', left, y)
    }
    y -= 16
  }
  if (inv.status === 'cancelled') {
    text('Facture annulée par avoir.', left, y, { color: rgb(0.7, 0.15, 0.15) })
    y -= 16
  }

  // Pied de page
  let fy = 70
  for (const l of wrap(org.footer ?? '', regular, 8, right - left).reverse()) {
    if (l) { text(l, left, fy, { size: 8, color: muted }); fy += 11 }
  }

  doc.setTitle(`${isCredit ? 'Avoir' : 'Facture'} ${inv.number}`)
  doc.setCreator('OstéoAssist')
  return doc.save()
}
