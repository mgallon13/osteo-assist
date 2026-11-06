import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Consultation } from '@/types/database'

/** Champs du compte rendu, dans l'ordre d'affichage par défaut. */
export const reportFields = [
  { key: 'reason', label: 'Motif de consultation', origin: 'patient' },
  { key: 'reported_symptoms', label: 'Symptômes rapportés', origin: 'patient' },
  { key: 'relevant_history', label: 'Antécédents pertinents', origin: 'history' },
  { key: 'practitioner_findings', label: 'Observations du praticien', origin: 'practitioner' },
  { key: 'techniques_performed', label: 'Techniques réalisées', origin: 'practitioner' },
  { key: 'progress_since_last', label: 'Évolution depuis la séance précédente', origin: 'patient' },
  { key: 'advice_given', label: 'Conseils donnés', origin: 'practitioner' },
  { key: 'additional_notes', label: 'Notes complémentaires', origin: 'practitioner' },
] as const

export type ReportFieldKey = (typeof reportFields)[number]['key']
export type ReportValues = Record<ReportFieldKey, string> & { suggested_follow_up_date: string }

export const originLabels = {
  patient: 'Déclaration du patient',
  practitioner: 'Observation du praticien',
  history: 'Historique',
} as const

export function usePatientConsultations(patientId: string, enabled = true) {
  return useQuery({
    queryKey: ['consultations', 'patient', patientId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .neq('status', 'cancelled')
        .order('consultation_date', { ascending: false })
        .returns<Consultation[]>()
      if (error) throw error
      return data
    },
  })
}

export function useConsultation(id: string) {
  return useQuery({
    queryKey: ['consultation', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('consultations').select('*').eq('id', id).single<Consultation>()
      if (error) throw error
      return data
    },
  })
}

export function useCreateConsultation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { organizationId: string; patientId: string; practitionerId: string }) => {
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          organization_id: input.organizationId,
          patient_id: input.patientId,
          practitioner_id: input.practitionerId,
        })
        .select()
        .single<Consultation>()
      if (error) throw error
      return data
    },
    onSuccess: (c) => qc.invalidateQueries({ queryKey: ['consultations', 'patient', c.patient_id] }),
  })
}

export function useSaveConsultation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: ReportValues & { ai_drafted?: boolean }) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]),
      )
      const { data, error } = await supabase
        .from('consultations')
        .update(payload)
        .eq('id', id)
        .select()
        .single<Consultation>()
      if (error) throw error
      return data
    },
    onSuccess: (c) => {
      qc.setQueryData(['consultation', id], c)
      qc.invalidateQueries({ queryKey: ['consultations', 'patient', c.patient_id] })
    },
  })
}

export function useValidateConsultation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('validate_consultation', { consultation: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultation', id] }),
  })
}
