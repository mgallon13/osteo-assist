import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '../shared/public-config.js'

// Configuration serveur. Tous les modèles passent par Vercel AI Gateway :
// en local via AI_GATEWAY_API_KEY, une fois déployé sur Vercel via le jeton OIDC
// fourni automatiquement au projet. Modèles interchangeables par variables d'environnement.

function optional(name: string, fallback: string): string {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : fallback
}

export const config = {
  supabaseUrl: () => optional('SUPABASE_URL', PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => optional('SUPABASE_ANON_KEY', PUBLIC_SUPABASE_KEY),
  models: {
    // Modèles européens par défaut (Mistral)
    language: () => optional('AI_MODEL_LANGUAGE', 'mistral/mistral-medium-3.5'),
    transcription: () => optional('AI_MODEL_TRANSCRIPTION', 'mistral/voxtral-small-transcribe-3'),
    embedding: () => optional('AI_MODEL_EMBEDDING', 'mistral/mistral-embed'),
  },
  /** 'delete_after_transcription' (défaut) ou 'keep' */
  recordingRetention: () => optional('RECORDING_RETENTION', 'delete_after_transcription'),
}
