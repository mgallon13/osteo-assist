// Fonctions IA métier. Elles reçoivent un client utilisateur (RLS) et un
// fournisseur de modèles injectable, pour être testées sans réseau.
import { createHash } from 'node:crypto'
import { generateText, Output, transcribe } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { consultationReportSchema, patientBriefSchema, type ConsultationReport, type PatientBrief } from '../../shared/ai-schemas.js'
import { config } from '../config.js'
import { HttpError } from '../http.js'
import { withFallbacks, type ModelProvider } from './models.js'
import { BRIEF_SYSTEM, REPORT_SYSTEM, buildBriefPrompt, buildReportPrompt } from './prompts.js'
import {
  getConsultation, getCurrentPractitionerId, getLatestTranscript, getMethodAnswers,
  getPreviousConsultations, getPseudonymousPatient, logUsage,
} from '../services/context.js'

interface Deps {
  db: SupabaseClient
  userId: string
  models: ModelProvider
}

// -----------------------------------------------------------------------------
// Transcription
// -----------------------------------------------------------------------------
interface RecordingRow {
  id: string
  organization_id: string
  consultation_id: string
  storage_path: string
  mime_type: string
  status: string
  updated_at: string
}

/** Une transcription « en cours » depuis plus longtemps est considérée comme abandonnée. */
const STALE_TRANSCRIPTION_MS = 10 * 60 * 1000

export async function transcribeRecording({ db, userId, models }: Deps, recordingId: string) {
  const { data: rec, error } = await db.from('consultation_recordings').select('*')
    .eq('id', recordingId).maybeSingle<RecordingRow>()
  if (error) throw error
  if (!rec) throw new HttpError(404, 'Enregistrement introuvable')
  if (rec.status === 'transcribing' && Date.now() - new Date(rec.updated_at).getTime() < STALE_TRANSCRIPTION_MS) {
    throw new HttpError(409, 'Transcription déjà en cours')
  }
  if (rec.status === 'deleted') throw new HttpError(410, 'Audio supprimé')

  const consultation = await getConsultation(db, rec.consultation_id)
  const practitionerId = await getCurrentPractitionerId(db, consultation.organization_id, userId)
  if (practitionerId !== consultation.practitioner_id) throw new HttpError(403, 'Réservé au praticien de la consultation')

  await db.from('consultation_recordings').update({ status: 'transcribing', error_message: null }).eq('id', rec.id)

  const { model, id: modelId } = models.transcription()
  const started = Date.now()
  try {
    const file = await db.storage.from('recordings').download(rec.storage_path)
    if (file.error || !file.data) throw new Error('Téléchargement de l’audio impossible')
    const audio = new Uint8Array(await file.data.arrayBuffer())

    const result = await transcribe({ model, audio, providerOptions: { mistral: { language: 'fr' } } })
    const text = result.text.trim()
    if (!text) throw new Error('Transcription vide')

    const { data: transcript, error: tErr } = await db.from('consultation_transcripts').insert({
      organization_id: rec.organization_id,
      consultation_id: rec.consultation_id,
      recording_id: rec.id,
      raw_text: text,
      segments: result.segments,
      language: result.language ?? 'fr',
      duration_seconds: result.durationInSeconds ?? null,
      model: modelId,
    }).select('id, raw_text, corrected_text, created_at').single()
    if (tErr) throw tErr

    // Minimisation : l'audio n'est plus utile une fois transcrit
    let audioDeleted = false
    if (config.recordingRetention() === 'delete_after_transcription') {
      const del = await db.storage.from('recordings').remove([rec.storage_path])
      audioDeleted = !del.error
    }
    await db.from('consultation_recordings').update({
      status: audioDeleted ? 'deleted' : 'transcribed',
      audio_deleted_at: audioDeleted ? new Date().toISOString() : null,
      duration_seconds: result.durationInSeconds ? Math.round(result.durationInSeconds) : null,
    }).eq('id', rec.id)

    await logUsage(db, {
      organization_id: rec.organization_id, user_id: userId, feature: 'transcription', model: modelId,
      audio_seconds: result.durationInSeconds ?? null, duration_ms: Date.now() - started, success: true,
    })
    return transcript
  } catch (e) {
    await db.from('consultation_recordings').update({
      status: 'failed', error_message: 'La transcription a échoué. Réessayez.',
    }).eq('id', rec.id)
    await logUsage(db, {
      organization_id: rec.organization_id, user_id: userId, feature: 'transcription', model: modelId,
      duration_ms: Date.now() - started, success: false,
    })
    if (e instanceof HttpError) throw e
    console.error('[transcription]', e instanceof Error ? e.message : e)
    throw new HttpError(502, 'La transcription a échoué. Réessayez.')
  }
}

// -----------------------------------------------------------------------------
// Compte rendu
// -----------------------------------------------------------------------------
export async function draftConsultationReport({ db, userId, models }: Deps, consultationId: string)
  : Promise<{ report: ConsultationReport; draftId: string }> {
  const consultation = await getConsultation(db, consultationId)
  const practitionerId = await getCurrentPractitionerId(db, consultation.organization_id, userId)
  if (practitionerId !== consultation.practitioner_id) throw new HttpError(403, 'Réservé au praticien de la consultation')

  const [patient, history, method, transcript] = await Promise.all([
    getPseudonymousPatient(db, consultation.patient_id),
    getPreviousConsultations(db, consultation.patient_id, { before: consultation.consultation_date, excludeId: consultation.id, limit: 3 }),
    getMethodAnswers(db, practitionerId),
    getLatestTranscript(db, consultation.id),
  ])
  const transcriptText = transcript?.corrected_text ?? transcript?.raw_text ?? null
  if (!transcriptText?.trim() && !consultation.quick_notes?.trim()) {
    throw new HttpError(422, 'Enregistrez la séance ou saisissez des notes avant de générer le compte rendu.')
  }

  const { model, id: modelId } = models.language()
  const started = Date.now()
  const result = await generateText({
    model,
    system: REPORT_SYSTEM,
    providerOptions: withFallbacks('mistral/mistral-large-4', 'mistral/mistral-small'),
    prompt: buildReportPrompt({ method, patient, history, transcript: transcriptText, quickNotes: consultation.quick_notes }),
    output: Output.object({ schema: consultationReportSchema }),
    temperature: 0.1,
  })
  const report = result.output

  const { data: draft, error } = await db.from('ai_draft_feedback').insert({
    organization_id: consultation.organization_id,
    practitioner_id: practitionerId,
    consultation_id: consultation.id,
    ai_draft: report,
    model: modelId,
  }).select('id').single<{ id: string }>()
  if (error) throw error

  await logUsage(db, {
    organization_id: consultation.organization_id, user_id: userId, feature: 'consultation_report', model: modelId,
    input_tokens: result.usage.inputTokens ?? null, output_tokens: result.usage.outputTokens ?? null,
    duration_ms: Date.now() - started, success: true,
  })
  return { report, draftId: draft.id }
}

// -----------------------------------------------------------------------------
// Synthèse avant séance
// -----------------------------------------------------------------------------
export async function getPatientBrief({ db, userId, models }: Deps, patientId: string, options: { force?: boolean } = {})
  : Promise<{ brief: PatientBrief | null; generatedAt: string | null; cached: boolean }> {
  const { data: patient, error: pErr } = await db.from('patients').select('id, organization_id')
    .eq('id', patientId).maybeSingle<{ id: string; organization_id: string }>()
  if (pErr) throw pErr
  if (!patient) throw new HttpError(404, 'Patient introuvable')

  const consultations = await getPreviousConsultations(db, patientId, { limit: 5 })
  if (consultations.length === 0) return { brief: null, generatedAt: null, cached: false }

  const sourceHash = createHash('sha256')
    .update(consultations.map((c) => `${c.id}:${c.updated_at}`).join('|'))
    .digest('hex')

  if (!options.force) {
    const { data: cached } = await db.from('patient_briefs').select('content, source_hash, generated_at')
      .eq('patient_id', patientId).maybeSingle<{ content: PatientBrief; source_hash: string; generated_at: string }>()
    if (cached && cached.source_hash === sourceHash) {
      return { brief: cached.content, generatedAt: cached.generated_at, cached: true }
    }
  }

  const practitionerId = await getCurrentPractitionerId(db, patient.organization_id, userId)
  const [pseudo, method] = await Promise.all([
    getPseudonymousPatient(db, patientId),
    getMethodAnswers(db, practitionerId),
  ])

  const { model, id: modelId } = models.language()
  const started = Date.now()
  const result = await generateText({
    model,
    system: BRIEF_SYSTEM,
    providerOptions: withFallbacks('mistral/mistral-large-4', 'mistral/mistral-small'),
    prompt: buildBriefPrompt({ method, patient: pseudo, consultations }),
    output: Output.object({ schema: patientBriefSchema }),
    temperature: 0.1,
  })
  const generatedAt = new Date().toISOString()
  const { error } = await db.from('patient_briefs').upsert({
    patient_id: patientId, organization_id: patient.organization_id, content: result.output,
    source_hash: sourceHash, model: modelId, generated_by: userId, generated_at: generatedAt,
  })
  if (error) throw error

  await logUsage(db, {
    organization_id: patient.organization_id, user_id: userId, feature: 'patient_brief', model: modelId,
    input_tokens: result.usage.inputTokens ?? null, output_tokens: result.usage.outputTokens ?? null,
    duration_ms: Date.now() - started, success: true,
  })
  return { brief: result.output, generatedAt, cached: false }
}
