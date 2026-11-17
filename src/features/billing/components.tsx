import { useState } from 'react'
import { Ban, CheckCircle2, Download, Mail, Receipt } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorMessage, Field, Input, Select } from '@/components/ui'
import { useWorkspace } from '@/features/auth/AuthProvider'
import type { Invoice, PaymentMethodValue } from '@/types/database'
import { formatDateFr, formatEuros, paymentMethodLabels } from '../../../shared/billing'
import { downloadInvoicePdf, useCancelInvoice, useConsultationInvoices, useCreateInvoice, useMarkPaid, useSendInvoice } from './api'

export function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
  if (invoice.kind === 'credit_note') return <Badge>Avoir</Badge>
  switch (invoice.status) {
    case 'paid': return <Badge tone="success">Payée</Badge>
    case 'issued': return <Badge tone="warning">À régler</Badge>
    case 'cancelled': return <Badge tone="danger">Annulée</Badge>
    default: return <Badge>Brouillon</Badge>
  }
}

/** Actions d'une facture : PDF, envoi, paiement, annulation par avoir. */
export function InvoiceActions({ invoice, compact }: { invoice: Invoice; compact?: boolean }) {
  const send = useSendInvoice()
  const pay = useMarkPaid()
  const cancel = useCancelInvoice()
  const [method, setMethod] = useState<PaymentMethodValue>('card')
  const [paying, setPaying] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [downloading, setDownloading] = useState(false)

  const size = 'sm' as const
  const canPay = invoice.kind === 'invoice' && invoice.status === 'issued'
  const canCancel = invoice.kind === 'invoice' && (invoice.status === 'issued' || invoice.status === 'paid')

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size={size} variant="secondary" loading={downloading} onClick={async () => {
          setError(null); setDownloading(true)
          try { await downloadInvoicePdf(invoice) } catch (e) { setError(e) } finally { setDownloading(false) }
        }}>
          {!downloading && <Download className="size-3.5" />} PDF
        </Button>
        <Button size={size} variant="secondary" loading={send.isPending} disabled={!invoice.patients?.email}
          title={invoice.patients?.email ? `Envoyer à ${invoice.patients.email}` : 'Aucune adresse e-mail pour ce patient'}
          onClick={() => { setError(null); send.mutate(invoice.id, { onError: setError }) }}>
          {!send.isPending && <Mail className="size-3.5" />} {invoice.sent_at ? 'Renvoyer' : 'Envoyer'}
        </Button>
        {canPay && !paying && (
          <Button size={size} variant="secondary" onClick={() => setPaying(true)}>
            <CheckCircle2 className="size-3.5" /> Payée
          </Button>
        )}
        {canCancel && !confirmCancel && !compact && (
          <Button size={size} variant="ghost" onClick={() => setConfirmCancel(true)}>
            <Ban className="size-3.5" /> Annuler
          </Button>
        )}
      </div>
      {paying && (
        <div className="flex flex-wrap items-center gap-2">
          <Select className="h-8 w-40" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodValue)} aria-label="Moyen de paiement">
            {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Button size={size} loading={pay.isPending} onClick={() => pay.mutate({ id: invoice.id, method }, { onSuccess: () => setPaying(false), onError: setError })}>
            Confirmer
          </Button>
          <Button size={size} variant="ghost" onClick={() => setPaying(false)}>Annuler</Button>
        </div>
      )}
      {confirmCancel && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Une facture émise ne se supprime pas : un avoir du même montant sera créé.
          <Button size={size} variant="danger" loading={cancel.isPending}
            onClick={() => cancel.mutate(invoice.id, { onSuccess: () => setConfirmCancel(false), onError: setError })}>
            Créer l’avoir
          </Button>
          <Button size={size} variant="ghost" onClick={() => setConfirmCancel(false)}>Retour</Button>
        </div>
      )}
      {send.isSuccess && <p className="text-xs text-accent-700">Envoyée à {send.data.sentTo}.</p>}
      {error != null && <ErrorMessage error={error} />}
    </div>
  )
}

/** Facturation en un clic depuis la consultation. */
export function ConsultationInvoiceCard({ consultationId, patientId, practitionerId, serviceDate }: {
  consultationId: string; patientId: string; practitionerId: string; serviceDate: string
}) {
  const { organizationId, organization } = useWorkspace()
  const invoices = useConsultationInvoices(consultationId)
  const create = useCreateInvoice()
  const defaultFee = organization.default_fee_cents ? String(organization.default_fee_cents / 100) : ''
  const [amount, setAmount] = useState(defaultFee)
  const [paid, setPaid] = useState(true)
  const [method, setMethod] = useState<PaymentMethodValue>('card')

  const active = (invoices.data ?? []).filter((i) => i.kind === 'invoice' && i.status !== 'cancelled')
  const amountCents = Math.round(Number(amount.replace(',', '.')) * 100)

  return (
    <Card>
      <CardHeader title="Facture" action={<Receipt className="size-4 text-stone-400" />} />
      <div className="space-y-3 p-5">
        {active.map((inv) => (
          <div key={inv.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">N° {inv.number} · {formatEuros(inv.amount_cents)}</span>
              <InvoiceStatusBadge invoice={inv} />
            </div>
            <InvoiceActions invoice={inv} compact />
          </div>
        ))}
        {active.length === 0 && (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              organizationId, patientId, practitionerId, consultationId, amountCents,
              label: 'Séance d’ostéopathie', serviceDate: serviceDate.slice(0, 10), paid, paymentMethod: paid ? method : null,
            })
          }}>
            <Field label="Montant (€)" htmlFor="fee" hint={organization.default_fee_cents ? undefined : 'Astuce : réglez un tarif par défaut dans Paramètres.'}>
              <Input id="fee" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="60" required />
            </Field>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Réglée aujourd’hui
            </label>
            {paid && (
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodValue)} aria-label="Moyen de paiement">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )}
            {create.error && <ErrorMessage error={create.error} />}
            <Button type="submit" className="w-full" loading={create.isPending} disabled={!(amountCents > 0)}>
              Créer la facture
            </Button>
            <p className="text-xs text-stone-500">Numéro attribué automatiquement. Une facture émise ne peut plus être modifiée.</p>
          </form>
        )}
      </div>
    </Card>
  )
}

export function InvoiceTable({ invoices, showPatient = true }: { invoices: Invoice[]; showPatient?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-stone-100 bg-stone-50/60 text-left text-xs font-medium text-stone-500">
          <tr>
            <th className="px-5 py-2.5">N°</th>
            <th className="px-5 py-2.5">Date</th>
            {showPatient && <th className="px-5 py-2.5">Patient</th>}
            <th className="px-5 py-2.5 text-right">Montant</th>
            <th className="px-5 py-2.5">Statut</th>
            <th className="px-5 py-2.5">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="align-top">
              <td className="px-5 py-3 font-medium tabular-nums">{inv.number ?? '—'}</td>
              <td className="px-5 py-3 text-stone-600 tabular-nums">{formatDateFr(inv.issue_date)}</td>
              {showPatient && (
                <td className="px-5 py-3">{inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name.toUpperCase()}` : '—'}</td>
              )}
              <td className="px-5 py-3 text-right tabular-nums">{formatEuros(inv.amount_cents)}</td>
              <td className="px-5 py-3"><InvoiceStatusBadge invoice={inv} /></td>
              <td className="px-5 py-3"><InvoiceActions invoice={inv} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
