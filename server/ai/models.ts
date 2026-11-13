import { gateway } from '@ai-sdk/gateway'
import type { EmbeddingModel, LanguageModel, TranscriptionModel } from 'ai'
import { config } from '../config.js'

/** Fournisseur de modèles, injectable pour les tests. */
export interface ModelProvider {
  language(): { model: LanguageModel; id: string }
  reasoning(): { model: LanguageModel; id: string }
  transcription(): { model: TranscriptionModel; id: string }
  embedding(): { model: EmbeddingModel; id: string }
}

export const gatewayModels: ModelProvider = {
  language: () => {
    const id = config.models.language()
    return { model: gateway(id), id }
  },
  reasoning: () => {
    const id = config.models.reasoning()
    return { model: gateway(id), id }
  },
  transcription: () => {
    const id = config.models.transcription()
    return { model: gateway.transcriptionModel(id), id }
  },
  embedding: () => {
    const id = config.models.embedding()
    return { model: gateway.embeddingModel(id), id }
  },
}

/**
 * Options AI Gateway : modèles de repli essayés dans l'ordre si le modèle principal
 * est indisponible (erreur fournisseur, surcharge), pour ne pas bloquer le praticien.
 */
export function withFallbacks(...models: string[]) {
  const list = [...new Set(models.filter(Boolean))]
  return list.length ? { gateway: { models: list } } : undefined
}
