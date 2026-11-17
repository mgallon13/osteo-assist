import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { Card, EmptyState, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/features/auth/AuthProvider'
import { formatEuros } from '../../../shared/billing'
import { useInvoices } from './api'
import { InvoiceTable } from './components'

type Filter = 'all' | 'unpaid' | 'paid' | 'credit'

export function BillingPage() {
  const { organizationId } = useWorkspace()
  const invoices = useInvoices(organizationId)
  const [filter, setFilter] = useState<Filter>('all')
  const [month] = useState(() => new Date().toISOString().slice(0, 7))

  if (invoices.isPending) return <Spinner />
  if (invoices.error) return <ErrorMessage error={invoices.error} />

  const all = invoices.data
  const paidThisMonth = all.filter((i) => i.kind === 'invoice' && i.status === 'paid' && i.paid_at?.startsWith(month))
    .reduce((s, i) => s + i.amount_cents, 0)
  const unpaid = all.filter((i) => i.kind === 'invoice' && i.status === 'issued')
  const unpaidTotal = unpaid.reduce((s, i) => s + i.amount_cents, 0)

  const shown = all.filter((i) =>
    filter === 'all' ? true
    : filter === 'unpaid' ? i.kind === 'invoice' && i.status === 'issued'
    : filter === 'paid' ? i.status === 'paid'
    : i.kind === 'credit_note')

  const tabs: [Filter, string][] = [['all', 'Toutes'], ['unpaid', `À régler (${unpaid.length})`], ['paid', 'Payées'], ['credit', 'Avoirs']]

  return (
    <>
      <PageHeader title="Facturation" description="Factures numérotées automatiquement. Pour corriger une facture émise, on l’annule par un avoir." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-stone-500">Encaissé ce mois-ci</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEuros(paidThisMonth)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-stone-500">Reste à encaisser</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEuros(unpaidTotal)}</p>
          <p className="text-xs text-stone-500">{unpaid.length} facture{unpaid.length > 1 ? 's' : ''}</p>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={cn('rounded-md px-3 py-1.5 text-sm', filter === k ? 'bg-accent-50 font-medium text-accent-700' : 'text-stone-600 hover:bg-stone-100')}>
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {shown.length === 0 ? (
          <EmptyState icon={<Receipt className="size-5" />} title="Aucune facture"
            description="Créez une facture depuis une consultation, en un clic." />
        ) : <InvoiceTable invoices={shown} />}
      </Card>
    </>
  )
}
