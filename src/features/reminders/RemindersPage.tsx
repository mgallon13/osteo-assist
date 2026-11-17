import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Check, Copy, Mail, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorMessage, Input, PageHeader, Spinner, Textarea } from '@/components/ui'
import { callApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth, useWorkspace } from '@/features/auth/AuthProvider'
import type { Invoice, PatientReminder } from '@/types/database'
import { defaultMessage, formatDateFr, formatEuros, reminderKindLabels } from '../../../shared/billing'

const SELECT = '*, patients(first_name, last_name, email, consent_email), consultations(consultation_date), invoices(number, amount_cents, issue_date)'
const UNPAID_AFTER_DAYS = 15

function today() {
  return new Date().toISOString().slice(0, 10)
}

function useReminders(organizationId: string) {
  return useQuery({
    queryKey: ['reminders', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('patient_reminders').select(SELECT)
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: true })
        .limit(500)
        .returns<PatientReminder[]>()
      if (error) throw error
      return data
    },
  })
}

/** Factures émises non réglées depuis plus de 15 jours, sans relance en cours. */
function useOverdueInvoices(organizationId: string) {
  return useQuery({
    queryKey: ['reminders', 'overdue', organizationId],
    queryFn: async () => {
      const limit = new Date(Date.now() - UNPAID_AFTER_DAYS * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase.from('invoices').select('*, patients(first_name, last_name, email)')
        .eq('organization_id', organizationId).eq('kind', 'invoice').eq('status', 'issued')
        .lte('issue_date', limit).returns<Invoice[]>()
      if (error) throw error
      return data
    },
  })
}

function ReminderCard({ reminder }: { reminder: PatientReminder }) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const { practitioner, organization } = useWorkspace()
  const p = reminder.patients
  const initial = defaultMessage(reminder.kind, {
    patientFirstName: p?.first_name ?? '',
    practitionerName: practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : '',
    signature: organization.message_signature,
    lastVisitDate: reminder.consultations?.consultation_date,
    doctolibUrl: practitioner?.doctolib_url,
    invoiceNumber: reminder.invoices?.number,
    invoiceAmountCents: reminder.invoices?.amount_cents,
    invoiceDate: reminder.invoices?.issue_date,
  })
  const [subject, setSubject] = useState(initial.subject)
  const [body, setBody] = useState(reminder.message ?? initial.body)
  const [copied, setCopied] = useState(false)
  const done = () => qc.invalidateQueries({ queryKey: ['reminders'] })

  const send = useMutation({
    mutationFn: () => callApi('/api/reminders/send', { reminderId: reminder.id, subject, body }),
    onSuccess: done,
  })
  const close = useMutation({
    mutationFn: async (status: 'sent' | 'dismissed') => {
      const { error } = await supabase.from('patient_reminders').update({
        status, message: status === 'sent' ? body : null, channel: 'manual',
        sent_at: status === 'sent' ? new Date().toISOString() : null, handled_by: session?.user.id,
      }).eq('id', reminder.id)
      if (error) throw error
    },
    onSuccess: done,
  })

  const canEmail = !!p?.email && p.consent_email
  const late = reminder.due_date < today()

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to={`/patients/${reminder.patient_id}`} className="font-medium text-stone-900 hover:text-accent-700">
            {p ? `${p.first_name} ${p.last_name.toUpperCase()}` : 'Patient'}
          </Link>
          <p className="text-xs text-stone-500">
            {reminderKindLabels[reminder.kind]} · prévue le {formatDateFr(reminder.due_date)}
            {reminder.invoices?.number && ` · facture ${reminder.invoices.number} (${formatEuros(reminder.invoices.amount_cents)})`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {late && <Badge tone="warning">En retard</Badge>}
          {!p?.email ? <Badge>Pas d’e-mail</Badge> : !p.consent_email ? <Badge tone="danger">Sans accord e-mail</Badge> : <Badge tone="success">Accord e-mail</Badge>}
        </div>
      </div>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Objet" className="mb-2" />
      <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => send.mutate()} loading={send.isPending} disabled={!canEmail}
          title={canEmail ? `Envoyer à ${p?.email}` : 'Il faut une adresse e-mail et l’accord du patient (fiche patient)'}>
          {!send.isPending && <Mail className="size-3.5" />} Valider et envoyer
        </Button>
        <Button size="sm" variant="secondary" onClick={async () => {
          await navigator.clipboard.writeText(body)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}>
          <Copy className="size-3.5" /> {copied ? 'Copié' : 'Copier (SMS)'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => close.mutate('sent')} loading={close.isPending && close.variables === 'sent'}>
          <Check className="size-3.5" /> Envoyé autrement
        </Button>
        <Button size="sm" variant="ghost" onClick={() => close.mutate('dismissed')} loading={close.isPending && close.variables === 'dismissed'}>
          <X className="size-3.5" /> Ignorer
        </Button>
      </div>
      {(send.error || close.error) && <div className="mt-2"><ErrorMessage error={send.error ?? close.error} /></div>}
    </Card>
  )
}

type Tab = 'todo' | 'upcoming' | 'history'

export function RemindersPage() {
  const { organizationId, organization } = useWorkspace()
  const qc = useQueryClient()
  const reminders = useReminders(organizationId)
  const overdue = useOverdueInvoices(organizationId)
  const [tab, setTab] = useState<Tab>('todo')

  const prepareUnpaid = useMutation({
    mutationFn: async (inv: Invoice) => {
      const { error } = await supabase.from('patient_reminders').insert({
        organization_id: organizationId, patient_id: inv.patient_id, invoice_id: inv.id,
        kind: 'unpaid_invoice', due_date: today(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })

  if (reminders.isPending || overdue.isPending) return <Spinner />
  if (reminders.error || overdue.error) return <ErrorMessage error={reminders.error ?? overdue.error} />

  const t = today()
  const pending = reminders.data.filter((r) => r.status === 'pending')
  const todo = pending.filter((r) => r.due_date <= t)
  const upcoming = pending.filter((r) => r.due_date > t)
  const history = reminders.data.filter((r) => r.status === 'sent' || r.status === 'dismissed').reverse()
  const withReminder = new Set(pending.map((r) => r.invoice_id).filter(Boolean))
  const unpaid = overdue.data.filter((i) => !withReminder.has(i.id))

  const tabs: [Tab, string][] = [['todo', `À traiter (${todo.length})`], ['upcoming', `À venir (${upcoming.length})`], ['history', 'Historique']]

  return (
    <>
      <PageHeader title="Relances"
        description="Préparées automatiquement après chaque séance validée. Rien n’est envoyé sans votre validation." />
      {!organization.reminders_enabled && (
        <p className="mb-4 rounded-md bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Les relances automatiques sont désactivées dans <Link to="/parametres" className="underline">Paramètres</Link>.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn('rounded-md px-3 py-1.5 text-sm', tab === k ? 'bg-accent-50 font-medium text-accent-700' : 'text-stone-600 hover:bg-stone-100')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'todo' && (
        <div className="max-w-3xl space-y-4">
          {unpaid.length > 0 && (
            <Card className="p-5">
              <p className="mb-2 text-sm font-medium">Factures non réglées depuis plus de {UNPAID_AFTER_DAYS} jours</p>
              <ul className="divide-y divide-stone-100">
                {unpaid.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name.toUpperCase()}` : '—'} · n° {inv.number} du {formatDateFr(inv.issue_date)} · {formatEuros(inv.amount_cents)}
                    </span>
                    <Button size="sm" variant="secondary" loading={prepareUnpaid.isPending && prepareUnpaid.variables?.id === inv.id}
                      onClick={() => prepareUnpaid.mutate(inv)}>Préparer une relance</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {todo.length === 0 && unpaid.length === 0 && (
            <Card><EmptyState icon={<BellRing className="size-5" />} title="Rien à traiter aujourd’hui"
              description="Les relances de suivi et d’entretien apparaîtront ici à leur date." /></Card>
          )}
          {todo.map((r) => <ReminderCard key={r.id} reminder={r} />)}
        </div>
      )}

      {tab === 'upcoming' && (
        <Card className="max-w-3xl">
          {upcoming.length === 0 ? <EmptyState icon={<BellRing className="size-5" />} title="Aucune relance programmée" /> : (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <Link to={`/patients/${r.patient_id}`} className="font-medium hover:text-accent-700">
                    {r.patients ? `${r.patients.first_name} ${r.patients.last_name.toUpperCase()}` : 'Patient'}
                  </Link>
                  <span className="text-stone-500">{reminderKindLabels[r.kind]} · {formatDateFr(r.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'history' && (
        <Card className="max-w-3xl">
          {history.length === 0 ? <EmptyState icon={<BellRing className="size-5" />} title="Aucune relance envoyée" /> : (
            <ul className="divide-y divide-stone-100">
              {history.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="font-medium">{r.patients ? `${r.patients.first_name} ${r.patients.last_name.toUpperCase()}` : 'Patient'}</span>
                  <span className="text-stone-500">
                    {reminderKindLabels[r.kind]} · {r.status === 'sent' ? `envoyée le ${formatDateFr(r.sent_at)}${r.channel === 'manual' ? ' (manuellement)' : ''}` : 'ignorée'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  )
}
