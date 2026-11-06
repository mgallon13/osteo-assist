import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { emptyToNull } from '@/lib/utils'
import type { Patient, PatientClinicalProfile, PatientSummary } from '@/types/database'

export const patientSchema = z.object({
  first_name: z.string().trim().min(1, 'Requis').max(100),
  last_name: z.string().trim().min(1, 'Requis').max(100),
  birth_date: z.string().optional(),
  email: z.union([z.literal(''), z.email('Email invalide')]).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  profession: z.string().trim().optional(),
  referring_doctor: z.string().trim().optional(),
  admin_notes: z.string().optional(),
  // Données cliniques (table séparée)
  medical_history: z.string().optional(),
  recurring_complaints: z.string().optional(),
  // Tant que la conformité HDS n'est pas en place : fictif obligatoire
  is_synthetic: z.literal(true, { message: 'Seuls les patients fictifs sont autorisés pour le moment' }),
})
export type PatientFormValues = z.infer<typeof patientSchema>

export function usePatients(organizationId: string, search: string) {
  return useQuery({
    queryKey: ['patients', organizationId, search],
    queryFn: async () => {
      let q = supabase
        .from('patient_summaries')
        .select('*')
        .eq('organization_id', organizationId)
        .is('archived_at', null)
        .order('last_name')
        .limit(200)
      const term = search.trim()
      if (term) {
        // Échappe les caractères spéciaux du filtre PostgREST
        const safe = term.replace(/[%,()]/g, ' ')
        q = q.or(`last_name.ilike.%${safe}%,first_name.ilike.%${safe}%,email.ilike.%${safe}%`)
      }
      const { data, error } = await q.returns<PatientSummary[]>()
      if (error) throw error
      return data
    },
  })
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('*').eq('id', patientId).single<Patient>()
      if (error) throw error
      return data
    },
  })
}

export function usePatientClinical(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['patient-clinical', patientId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_clinical_profiles')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle<PatientClinicalProfile>()
      if (error) throw error
      return data
    },
  })
}

function splitValues(values: PatientFormValues) {
  const { medical_history, recurring_complaints, ...admin } = values
  return {
    admin: emptyToNull({ ...admin, birth_date: admin.birth_date || null }),
    clinical: emptyToNull({ medical_history: medical_history ?? '', recurring_complaints: recurring_complaints ?? '' }),
  }
}

export function useSavePatient(organizationId: string, canAccessClinical: boolean) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: PatientFormValues }) => {
      const { admin, clinical } = splitValues(values)
      const { data: patient, error } = id
        ? await supabase.from('patients').update(admin).eq('id', id).select().single<Patient>()
        : await supabase.from('patients').insert({ ...admin, organization_id: organizationId }).select().single<Patient>()
      if (error) throw error

      if (canAccessClinical) {
        const { error: cErr } = await supabase
          .from('patient_clinical_profiles')
          .upsert({ patient_id: patient.id, organization_id: organizationId, ...clinical })
        if (cErr) throw cErr
      }
      return patient
    },
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: ['patients', organizationId] })
      qc.invalidateQueries({ queryKey: ['patient', patient.id] })
      qc.invalidateQueries({ queryKey: ['patient-clinical', patient.id] })
    },
  })
}
