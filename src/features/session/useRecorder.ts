import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped'

const CANDIDATE_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
}

/** Enregistrement audio dans le navigateur (MediaRecorder), avec pause et chronomètre. */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number | null>(null)

  const stopTimer = () => {
    if (timer.current != null) window.clearInterval(timer.current)
    timer.current = null
  }
  const startTimer = () => {
    stopTimer()
    timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000)
  }
  const releaseMic = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  useEffect(() => () => {
    stopTimer()
    if (recorder.current?.state !== 'inactive') recorder.current?.stop()
    releaseMic()
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('L’enregistrement audio n’est pas disponible dans ce navigateur.')
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
    } catch {
      setError('Accès au micro refusé. Autorisez le micro dans les réglages du navigateur.')
      return
    }
    const mimeType = pickMimeType()
    const r = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 })
    chunks.current = []
    r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
    r.start(1000)
    recorder.current = r
    setElapsed(0)
    setState('recording')
    startTimer()
  }, [])

  const pause = useCallback(() => {
    recorder.current?.pause()
    stopTimer()
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    recorder.current?.resume()
    startTimer()
    setState('recording')
  }, [])

  /** Termine l'enregistrement et renvoie le fichier audio. */
  const stop = useCallback(() => new Promise<Blob | null>((resolve) => {
    const r = recorder.current
    stopTimer()
    if (!r || r.state === 'inactive') return resolve(null)
    r.onstop = () => {
      releaseMic()
      setState('stopped')
      resolve(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }))
    }
    r.stop()
  }), [])

  const reset = useCallback(() => {
    chunks.current = []
    setElapsed(0)
    setState('idle')
  }, [])

  return { state, elapsed, error, start, pause, resume, stop, reset }
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
