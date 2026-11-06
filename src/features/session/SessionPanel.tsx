import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Pause, Play, RotateCcw, Sparkles, Square, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorMessage, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ConsultationReport } from '../../../shared/ai-schemas'
import {
  useDraftReport, useLatestRecording, useLatestTranscript, useRetryTranscription,
  useSaveQuickNotes, useSaveTranscriptCorrection, useUploadAndTranscribe,
} from './api'
import { formatDuration, useRecorder } from './useRecorder'

type Step = 'upload' | 'transcribe' | null

export function SessionPanel({ consultationId, organizationId, userId, initialQuickNotes, onDraft }: {
  consultationId: string
  organizationId: string
  userId: string
  initialQuickNotes: string | null
  onDraft: (report: ConsultationReport) => void
}) {
  const recorder = useRecorder()
  const [consent, setConsent] = useState(false)
  const [step, setStep] = useState<Step>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const transcript = useLatestTranscript(consultationId)
  const recording = useLatestRecording(consultationId)
  const upload = useUploadAndTranscribe({ consultationId, organizationId, userId })
  const retry = useRetryTranscription(consultationId)
  const draft = useDraftReport(consultationId)

  const send = async (audio: Blob, durationSeconds?: number) => {
    try {
      await upload.mutateAsync({ audio, durationSeconds, onStep: setStep })
      recorder.reset()
    } finally {
      setStep(null)
    }
  }

  const onStop = async () => {
    const duration = recorder.elapsed
    const audio = await recorder.stop()
    if (audio && audio.size > 0) await send(audio, duration)
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    setImportError(null)
    if (file.size > 100 * 1024 * 1024) return setImportError('Fichier trop volumineux (100 Mo maximum).')
    await send(file)
    if (fileInput.current) fileInput.current.value = ''
  }
  const busy = upload.isPending || retry.isPending
  const failed = recording.data?.status === 'failed' && !busy
  const hasTranscript = !!transcript.data
  const isRecording = recorder.state === 'recording' || recorder.state === 'paused'

  return (
    <Card>
      <CardHeader
        title="Séance"
        description="Enregistrez la séance ou importez une dictée ; la transcription alimente le compte rendu."
        action={hasTranscript ? <Badge tone="success">Transcrit</Badge> : undefined}
      />
      <div className="space-y-5 p-5">
        {/* Consentement + enregistrement */}
        {!isRecording && !busy && (
          <label className="flex items-start gap-2.5 text-sm text-stone-700">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Le patient a été informé de l’enregistrement et de sa finalité (rédaction du compte rendu), et il y consent.</span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {recorder.state === 'idle' || recorder.state === 'stopped' ? (
            <>
              <Button type="button" onClick={recorder.start} disabled={!consent || busy}>
                <Mic className="size-4" /> {hasTranscript ? 'Nouvel enregistrement' : 'Démarrer l’enregistrement'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={!consent || busy}>
                <Upload className="size-4" /> Importer un audio
              </Button>
              <input
                ref={fileInput} type="file" accept="audio/*" className="hidden"
                onChange={(e) => onImport(e.target.files?.[0])}
              />
            </>
          ) : (
            <>
              <span className="mr-1 inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 tabular-nums">
                <span className={cn('size-2 rounded-full bg-red-600', recorder.state === 'recording' && 'animate-pulse')} aria-hidden />
                {recorder.state === 'paused' ? 'En pause' : 'Enregistrement'} · {formatDuration(recorder.elapsed)}
              </span>
              {recorder.state === 'recording' ? (
                <Button type="button" variant="secondary" onClick={recorder.pause}><Pause className="size-4" /> Pause</Button>
              ) : (
                <Button type="button" variant="secondary" onClick={recorder.resume}><Play className="size-4" /> Reprendre</Button>
              )}
              <Button type="button" onClick={onStop}><Square className="size-4" /> Terminer</Button>
            </>
          )}
        </div>

        {step && (
          <p className="flex items-center gap-2 text-sm text-stone-600" role="status">
            <Loader2 className="size-4 animate-spin" />
            {step === 'upload' ? 'Envoi de l’audio…' : 'Transcription en cours (environ 1 minute pour 30 minutes de séance)…'}
          </p>
        )}
        {recorder.error && <ErrorMessage error={new Error(recorder.error)} />}
        {importError && <ErrorMessage error={new Error(importError)} />}
        {upload.error && <ErrorMessage error={upload.error} />}
        {failed && recording.data && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {recording.data.error_message ?? 'La transcription a échoué.'}
            <Button type="button" size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(recording.data!.id)}>
              <RotateCcw className="size-3.5" /> Réessayer
            </Button>
          </div>
        )}

        <QuickNotes consultationId={consultationId} initial={initialQuickNotes} />

        {transcript.data && (
          <TranscriptEditor
            key={transcript.data.id}
            consultationId={consultationId}
            id={transcript.data.id}
            text={transcript.data.corrected_text ?? transcript.data.raw_text}
            corrected={transcript.data.corrected_text != null}
          />
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
          <Button
            type="button"
            onClick={async () => onDraft((await draft.mutateAsync()).report)}
            loading={draft.isPending}
            disabled={isRecording || busy}
          >
            <Sparkles className="size-4" /> Générer le compte rendu
          </Button>
          <span className="text-xs text-stone-500">À partir de la transcription, de vos notes et des séances validées.</span>
        </div>
        {draft.error && <ErrorMessage error={draft.error} />}
      </div>
    </Card>
  )
}

function QuickNotes({ consultationId, initial }: { consultationId: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const save = useSaveQuickNotes(consultationId)
  const { mutate } = save
  const [saved, setSaved] = useState(initial ?? '')

  // Sauvegarde automatique 1 s après la dernière frappe
  useEffect(() => {
    if (value === saved) return
    const t = window.setTimeout(() => {
      mutate(value, { onSuccess: () => setSaved(value) })
    }, 1000)
    return () => window.clearTimeout(t)
  }, [value, saved, mutate])

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="quick_notes" className="text-sm font-medium text-stone-700">Notes rapides</label>
        <span className="text-xs text-stone-400">
          {save.isPending ? 'Enregistrement…' : save.isError ? 'Non enregistré' : value !== saved ? '' : value ? 'Enregistré' : ''}
        </span>
      </div>
      <Textarea
        id="quick_notes" rows={3} value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="Tests, résultats, mouvement de référence… dans vos abréviations."
      />
    </div>
  )
}

function TranscriptEditor({ consultationId, id, text, corrected }: { consultationId: string; id: string; text: string; corrected: boolean }) {
  const [value, setValue] = useState(text)
  const [open, setOpen] = useState(false)
  const save = useSaveTranscriptCorrection(consultationId)
  const words = text.trim().split(/\s+/).length

  return (
    <div className="rounded-md border border-stone-200">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-stone-50" aria-expanded={open}>
        <span className="font-medium text-stone-700">Transcription</span>
        <span className="text-xs text-stone-500">{words} mots{corrected ? ' · corrigée' : ''} · {open ? 'Masquer' : 'Afficher'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-stone-100 p-3">
          <Textarea rows={10} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Transcription" />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={value === text} loading={save.isPending}
              onClick={() => save.mutate({ id, text: value })}>
              Enregistrer la correction
            </Button>
            {save.error && <span className="text-xs text-red-600">Échec de l’enregistrement</span>}
          </div>
        </div>
      )}
    </div>
  )
}
