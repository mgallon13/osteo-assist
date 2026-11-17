import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { callApi } from '@/lib/api'
import type { Invoice, PaymentMethodValue } from '@/types/database'

const INVOICE_SELECT = '*, patients(first_name, last_name, email)'

export function useInvoices(organizationId: string) {
  return useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select(INVOICE_SELECT)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500)
        .returns<Invoice[]>()
      if (error) throw error
      return data
    },
  })
}

export function usePatientInvoices(patientId: string) {
  return useQuery({
    queryKey: ['invoices', 'patient', patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select(INVOICE_SELECT)
        .eq('patient_id', patientId).order('created_at', { ascending: false }).returns<Invoice[]>()
      if (error) throw error
      return data
    },
  })
}

export function useConsultationInvoices(consultationId: string) {
  return useQuery({
    queryKey: ['invoices', 'consultation', consultationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select(INVOICE_SELECT)
        .eq('consultation_id', consultationId).order('created_at', { ascending: false }).returns<Invoice[]>()
      if (error) throw error
      return data
    },
  })
}

function useInvalidateInvoices() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['reminders'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

/** Crée la facture et l'émet aussitôt (numéro définitif), éventuellement déjà réglée. */
export function useCreateInvoice() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: async (input: {
      organizationId: string; patientId: string; practitionerId: string; consultationId?: string | null
      amountCents: number; label: string; serviceDate: string; paid: boolean; paymentMethod: PaymentMethodValue | null
    }) => {
      const { data: draft, error } = await supabase.from('invoices').insert({
        organization_id: input.organizationId,
        patient_id: input.patientId,
        practitioner_id: input.practitionerId,
        consultation_id: input.consultationId ?? null,
        amount_cents: input.amountCents,
        label: input.label,
        service_date: input.serviceDate,
      }).select('id').single<{ id: string }>()
      if (error) throw error
      const { error: issueErr } = await supabase.rpc('issue_invoice', { invoice: draft.id })
      if (issueErr) throw issueErr
      if (input.paid) {
        const { error: payErr } = await supabase.from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: input.paymentMethod })
          .eq('id', draft.id)
        if (payErr) throw payErr
      }
      return draft.id
    },
    onSuccess: invalidate,
  })
}

export function useMarkPaid() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: async ({ id, method }: { id: string; method: PaymentMethodValue }) => {
      const { error } = await supabase.from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: method }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useCancelInvoice() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_invoice', { invoice: id })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSendInvoice() {
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: (id: string) => callApi<{ sentTo: string }>('/api/invoices/send', { invoiceId: id }),
    onSuccess: invalidate,
  })
}

/** Télécharge le PDF (généré côté serveur à partir de la facture figée). */
export async function downloadInvoicePdf(invoice: Pick<Invoice, 'id' | 'number' | 'kind'>) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnectez-vous.')
  const res = await fetch('/api/invoices/pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ invoiceId: invoice.id }),
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Erreur ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${invoice.kind === 'credit_note' ? 'avoir' : 'facture'}-${invoice.number}.pdf`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
