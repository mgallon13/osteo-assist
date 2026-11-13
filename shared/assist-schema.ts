// Résultat de l'aide au praticien, partagé entre serveur et interface.
import { z } from 'zod'

export const assistItemSchema = z.object({
  text: z.string().describe('Une suggestion courte et actionnable, formulée comme une piste à envisager.'),
  source_ids: z.array(z.string()).describe('Identifiants des sources fournies (ex. R3, C1, P2, M). Au moins un.'),
})

export const redFlagItemSchema = assistItemSchema.extend({
  status: z.enum(['to_check', 'reported_absent', 'reported_present'])
    .describe('to_check : non documenté dans l’anamnèse ; reported_absent : l’anamnèse indique son absence ; reported_present : l’anamnèse le mentionne.'),
})

export const assistOutputSchema = z.object({
  summary: z.string().describe('Une ou deux phrases qui résument l’anamnèse telle que comprise.'),
  red_flags: z.array(redFlagItemSchema).describe('Signes d’alerte pertinents pour ce cas.'),
  questions_to_ask: z.array(assistItemSchema).describe('Questions d’anamnèse qui manquent pour ce motif.'),
  tests_to_consider: z.array(assistItemSchema),
  treatment_leads: z.array(assistItemSchema).describe('Pistes de traitement, dans la logique de la méthode du praticien quand elle est connue.'),
  if_no_improvement: z.array(assistItemSchema),
  similar_cases: z.array(assistItemSchema).describe('Ce qui a été fait dans des cas comparables du cabinet, et le résultat noté.'),
  evidence: z.array(assistItemSchema).describe('Ce que disent les publications fournies, avec leur limite.'),
})
export type AssistOutput = z.infer<typeof assistOutputSchema>

export type AssistSourceKind = 'reference' | 'case' | 'pubmed' | 'method'

export interface AssistSource {
  id: string
  kind: AssistSourceKind
  label: string
  detail?: string
  url?: string
}

export type AssistItem = z.infer<typeof assistItemSchema>
export type RedFlagAssistItem = z.infer<typeof redFlagItemSchema>

export interface AssistResult {
  runId: string
  motifs: string[]
  createdAt: string
  content: AssistOutput
  sources: AssistSource[]
  /** Nombre de suggestions retirées car elles ne citaient aucune source valide. */
  dropped: number
}
