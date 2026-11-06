// Schémas partagés entre le serveur (sortie structurée du modèle) et l'interface.
import { z } from 'zod'

/** Origine d'une information dans le compte rendu. */
export const sourceSchema = z.enum(['transcript', 'notes', 'history'])
export type ReportSource = z.infer<typeof sourceSchema>

const section = z.object({
  content: z
    .string()
    .nullable()
    .describe('Texte de la section. null si l’information n’apparaît ni dans la transcription, ni dans les notes, ni dans l’historique.'),
  sources: z.array(sourceSchema).describe('D’où vient l’information. Vide si content est null.'),
})

export const reportKeys = [
  'reason',
  'reported_symptoms',
  'relevant_history',
  'practitioner_findings',
  'techniques_performed',
  'progress_since_last',
  'advice_given',
  'additional_notes',
] as const
export type ReportKey = (typeof reportKeys)[number]

export const consultationReportSchema = z.object({
  sections: z.object({
    reason: section.describe('Motif de consultation, tel que formulé par le patient.'),
    reported_symptoms: section.describe('Déclarations du patient : localisation, ancienneté, rythme, évolution, facteurs déclenchants.'),
    relevant_history: section.describe('Antécédents pertinents pour ce motif (traumas, chirurgies, traitements, examens).'),
    practitioner_findings: section.describe('Observations et tests effectués par le praticien, avec leurs résultats, tels qu’énoncés.'),
    techniques_performed: section.describe('Techniques effectivement réalisées pendant la séance, nommées comme le praticien les nomme.'),
    progress_since_last: section.describe('Évolution depuis la séance précédente, selon le patient.'),
    advice_given: section.describe('Conseils effectivement donnés au patient pendant la séance.'),
    additional_notes: section.describe('Autres éléments utiles mentionnés (hygiène de vie, profession, sport…).'),
  }),
  suggested_follow_up_days: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe('Délai de revoyure explicitement évoqué pendant la séance, en jours. null sinon.'),
  to_verify: z
    .array(z.string())
    .describe('Passages ambigus, inaudibles ou contradictoires que le praticien doit vérifier.'),
})
export type ConsultationReport = z.infer<typeof consultationReportSchema>

export const patientBriefSchema = z.object({
  headline: z.string().describe('Une phrase : qui est le patient et pourquoi il consulte habituellement.'),
  last_visit: z.object({
    date: z.string().nullable(),
    reason: z.string().nullable(),
    treated: z.string().nullable().describe('Ce qui a été traité lors de la dernière séance.'),
    advice: z.string().nullable(),
    reference_movement: z.string().nullable().describe('Mouvement ou test de référence noté pour comparer avant / après.'),
  }),
  history_points: z
    .array(z.object({ text: z.string(), consultation_date: z.string().nullable() }))
    .describe('Points marquants des séances précédentes (évolution, récidives, liens retrouvés), avec la date de la séance source.'),
  lifestyle: z.array(z.string()).describe('Éléments d’hygiène de vie notés : profession, sport, alimentation, sommeil.'),
  to_ask: z.array(z.string()).describe('Points de suivi à demander au patient, tirés des séances précédentes (ex. : conseils donnés à vérifier).'),
})
export type PatientBrief = z.infer<typeof patientBriefSchema>
