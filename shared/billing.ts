// Formats et modèles de messages partagés entre l'interface et le serveur.

export const paymentMethodLabels = {
  card: 'Carte bancaire',
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  other: 'Autre',
} as const
export type PaymentMethod = keyof typeof paymentMethodLabels

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
    .replace(/ /g, ' ').replace(/ /g, ' ')
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export type ReminderKind = 'follow_up' | 'maintenance' | 'unpaid_invoice'

export const reminderKindLabels: Record<ReminderKind, string> = {
  follow_up: 'Suivi',
  maintenance: 'Entretien',
  unpaid_invoice: 'Facture impayée',
}

export interface MessageContext {
  patientFirstName: string
  practitionerName: string
  signature?: string | null
  lastVisitDate?: string | null
  doctolibUrl?: string | null
  invoiceNumber?: string | null
  invoiceAmountCents?: number | null
  invoiceDate?: string | null
}

/**
 * Messages par défaut : sobres, au vouvoiement, sans aucune information médicale,
 * sans promesse de résultat. Le praticien les relit et peut les modifier avant envoi.
 */
export function defaultMessage(kind: ReminderKind, c: MessageContext): { subject: string; body: string } {
  const sign = (c.signature?.trim() || c.practitionerName).trim()
  const hello = `Bonjour ${c.patientFirstName},`
  const rdv = c.doctolibUrl ? `\n\nSi vous le souhaitez, vous pouvez prendre rendez-vous ici : ${c.doctolibUrl}` : ''
  switch (kind) {
    case 'follow_up':
      return {
        subject: 'Suite à votre séance',
        body: `${hello}\n\nC'est ${c.practitionerName}, l'ostéopathe que vous avez vu le ${formatDateFr(c.lastVisitDate)}. J'espère que vous allez bien.\n\nComment vous sentez-vous depuis notre séance ?${rdv}\n\nBonne journée,\n${sign}`,
      }
    case 'maintenance':
      return {
        subject: 'Prendre soin de vous',
        body: `${hello}\n\nC'est ${c.practitionerName}, votre ostéopathe. Notre dernière séance date du ${formatDateFr(c.lastVisitDate)} : j'espère que tout va bien de votre côté.\n\nSi vous ressentez à nouveau une gêne, ou pour faire un point, je reste à votre disposition.${rdv}\n\nBonne journée,\n${sign}`,
      }
    case 'unpaid_invoice':
      return {
        subject: `Facture n° ${c.invoiceNumber ?? ''}`,
        body: `${hello}\n\nSauf erreur de ma part, la facture n° ${c.invoiceNumber} du ${formatDateFr(c.invoiceDate)}, d'un montant de ${formatEuros(c.invoiceAmountCents ?? 0)}, reste à régler.\n\nSi le règlement a déjà été effectué, merci de ne pas tenir compte de ce message.\n\nBonne journée,\n${sign}`,
      }
  }
}
