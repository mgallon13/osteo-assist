// Configuration serveur. Tous les modèles passent par Vercel AI Gateway
// (variable AI_GATEWAY_API_KEY) et sont interchangeables par variables d'environnement.

function optional(name: string, fallback: string): string {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : fallback
}

function required(name: string): string {
  const v = process.env[name]
  if (!v || !v.trim()) throw new Error(`Variable d'environnement manquante : ${name}`)
  return v.trim()
}

export const config = {
  supabaseUrl: () => required('SUPABASE_URL'),
  supabaseAnonKey: () => required('SUPABASE_ANON_KEY'),
  models: {
    // Modèles européens par défaut (Mistral)
    language: () => optional('AI_MODEL_LANGUAGE', 'mistral/mistral-medium-3.5'),
    transcription: () => optional('AI_MODEL_TRANSCRIPTION', 'mistral/voxtral-small-transcribe-3'),
    embedding: () => optional('AI_MODEL_EMBEDDING', 'mistral/mistral-embed'),
  },
  /** 'delete_after_transcription' (défaut) ou 'keep' */
  recordingRetention: () => optional('RECORDING_RETENTION', 'delete_after_transcription'),
}
