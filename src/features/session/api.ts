import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { callApi } from '@/lib/api'
import type { ConsultationReport, PatientBrief } from '../../../shared/ai-schemas'

export interface Transcript {
  id: string
  raw_text: string
  corrected_text: string | null
  model: string
  created_at: string
}

export interface Recording {
  id: string
  status: 'uploaded' | 'transcribing' | 'transcribed' | 'failed' | 'deleted'
  error_message: string | null
  duration_seconds: number | null
  created_at: string
}

export function useLatestTranscript(consultationId: string) {
  return useQuery({
    queryKey: ['transcript', consultationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('consultation_transcripts')
        .select('id, raw_text, corrected_text, model, created_at')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<Transcript>()
      if (error) throw error
      return data
    },
  })
}

export function useLatestRecording(consultationId: string) {
  return useQuery({
    queryKey: ['recording', consultationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('consultation_recordings')
        .select('id, status, error_message, duration_seconds, created_at')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<Recording>()
      if (error) throw error
      return data
    },
  })
}

const extensionFor = (type: string) =>
  type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : 'webm'

/** Envoie l'audio (enregistré ou importé) puis lance la transcription. */
export function useUploadAndTranscribe(input: { consultationId: string; organizationId: string; userId: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ audio, durationSeconds, onStep }: {
      audio: Blob; durationSeconds?: number; onStep?: (step: 'upload' | 'transcribe') => void
    }) => {
      onStep?.('upload')
      const mime = (audio.type || 'audio/webm').split(';')[0]!
      const path = `${input.organizationId}/${input.consultationId}/${crypto.randomUUID()}.${extensionFor(mime)}`
      const up = await supabase.storage.from('recordings').upload(path, audio, { contentType: mime, upsert: false })
      if (up.error) throw new Error('Envoi de l’audio impossible. Vérifiez votre connexion.')

      const { data: rec, error } = await supabase.from('consultation_recordings').insert({
        organization_id: input.organizationId,
        consultation_id: input.consultationId,
        storage_path: path,
        mime_type: mime,
        size_bytes: audio.size,
        duration_seconds: durationSeconds ?? null,
        consent_confirmed_at: new Date().toISOString(),
        consent_confirmed_by: input.userId,
      }).select('id').single<{ id: string }>()
      if (error) throw error

      onStep?.('transcribe')
      return callApi<{ transcript: Transcript }>('/api/ai/transcribe', { recordingId: rec.id })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['transcript', input.consultationId] })
      qc.invalidateQueries({ queryKey: ['recording', input.consultationId] })
    },
  })
}

export function useRetryTranscription(consultationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordingId: string) => callApi<{ transcript: Transcript }>('/api/ai/transcribe', { recordingId }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['transcript', consultationId] })
      qc.invalidateQueries({ queryKey: ['recording', consultationId] })
    },
  })
}

export function useSaveTranscriptCorrection(consultationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase.from('consultation_transcripts').update({ corrected_text: text }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transcript', consultationId] }),
  })
}

export function useSaveQuickNotes(consultationId: string) {
  return useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('consultations').update({ quick_notes: text || null }).eq('id', consultationId)
      if (error) throw error
    },
  })
}

export function useDraftReport(consultationId: string) {
  return useMutation({
    mutationFn: () => callApi<{ report: ConsultationReport; draftId: string }>(
      '/api/ai/consultation-report', { consultationId },
    ),
  })
}

export interface BriefResponse { brief: PatientBrief | null; generatedAt: string | null; cached: boolean }

export function usePatientBrief(patientId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['patient-brief', patientId],
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => callApi<BriefResponse>('/api/ai/patient-brief', { patientId }),
  })
}

export function useRefreshPatientBrief(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => callApi<BriefResponse>('/api/ai/patient-brief', { patientId, force: true }),
    onSuccess: (data) => qc.setQueryData(['patient-brief', patientId], data),
  })
}
