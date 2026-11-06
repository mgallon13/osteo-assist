// Chargement des données nécessaires aux fonctions IA.
// Toutes les lectures passent par le client utilisateur : la RLS s'applique.
import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from '../http.js'

export interface ConsultationRow {
  id: string
  organization_id: string
  patient_id: string
  practitioner_id: string
  consultation_date: string
  status: string
  reason: string | null
  reported_symptoms: string | null
  relevant_history: string | null
  practitioner_findings: string | null
  techniques_performed: string | null
  progress_since_last: string | null
  advice_given: string | null
  additional_notes: string | null
  quick_notes: string | null
  updated_at: string
}

/** Profil pseudonymisé : jamais de nom, d'adresse ni de coordonnées envoyés au modèle. */
export interface PseudonymousPatient {
  age: number | null
  profession: string | null
  medical_history: string | null
  recurring_complaints: string | null
}

export interface MethodAnswers {
  [key: string]: string | string[] | undefined
}

function age(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--
  return a
}

export async function getConsultation(db: SupabaseClient, id: string): Promise<ConsultationRow> {
  const { data, error } = await db.from('consultations').select('*').eq('id', id).maybeSingle<ConsultationRow>()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Consultation introuvable')
  return data
}

export async function getPseudonymousPatient(db: SupabaseClient, patientId: string): Promise<PseudonymousPatient> {
  const [p, c] = await Promise.all([
    db.from('patients').select('birth_date, profession').eq('id', patientId).maybeSingle<{ birth_date: string | null; profession: string | null }>(),
    db.from('patient_clinical_profiles').select('medical_history, recurring_complaints').eq('patient_id', patientId)
      .maybeSingle<{ medical_history: string | null; recurring_complaints: string | null }>(),
  ])
  if (p.error) throw p.error
  if (c.error) throw c.error
  if (!p.data) throw new HttpError(404, 'Patient introuvable')
  return {
    age: age(p.data.birth_date),
    profession: p.data.profession,
    medical_history: c.data?.medical_history ?? null,
    recurring_complaints: c.data?.recurring_complaints ?? null,
  }
}

export async function getPreviousConsultations(
  db: SupabaseClient, patientId: string, options: { before?: string; excludeId?: string; limit: number },
): Promise<ConsultationRow[]> {
  let q = db.from('consultations').select('*')
    .eq('patient_id', patientId)
    .eq('status', 'validated')
    .order('consultation_date', { ascending: false })
    .limit(options.limit)
  if (options.before) q = q.lt('consultation_date', options.before)
  if (options.excludeId) q = q.neq('id', options.excludeId)
  const { data, error } = await q.returns<ConsultationRow[]>()
  if (error) throw error
  return data
}

export async function getMethodAnswers(db: SupabaseClient, practitionerId: string): Promise<MethodAnswers> {
  const { data, error } = await db.from('practitioner_method_profiles').select('answers')
    .eq('practitioner_id', practitionerId).maybeSingle<{ answers: MethodAnswers }>()
  if (error) throw error
  return data?.answers ?? {}
}

export async function getCurrentPractitionerId(db: SupabaseClient, organizationId: string, userId: string): Promise<string> {
  const { data, error } = await db.from('practitioners').select('id')
    .eq('organization_id', organizationId).eq('user_id', userId).maybeSingle<{ id: string }>()
  if (error) throw error
  if (!data) throw new HttpError(403, 'Profil praticien introuvable')
  return data.id
}

export async function getLatestTranscript(db: SupabaseClient, consultationId: string) {
  const { data, error } = await db.from('consultation_transcripts')
    .select('id, raw_text, corrected_text')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; raw_text: string; corrected_text: string | null }>()
  if (error) throw error
  return data
}

export async function logUsage(db: SupabaseClient, row: {
  organization_id: string; user_id: string; feature: string; model: string
  input_tokens?: number | null; output_tokens?: number | null; audio_seconds?: number | null
  duration_ms: number; success: boolean
}) {
  const { error } = await db.from('ai_usage').insert(row)
  if (error) console.error('[ai_usage] insertion impossible', error.message)
}
