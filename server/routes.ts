// Définition des routes IA, indépendante de l'hébergement (Vercel ou serveur de dev).
import { z } from 'zod'
import { authenticate, type Authenticator } from './auth.js'
import { gatewayModels, type ModelProvider } from './ai/models.js'
import { draftConsultationReport, getPatientBrief, transcribeRecording } from './ai/features.js'
import { handler, json, parseBody } from './http.js'

export interface RouteDeps {
  auth: Authenticator
  models: ModelProvider
}

const defaults: RouteDeps = { auth: authenticate, models: gatewayModels }

const uuid = z.uuid()

export function transcribeRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db, userId } = await deps.auth(request)
    const { recordingId } = await parseBody(request, z.object({ recordingId: uuid }))
    const transcript = await transcribeRecording({ db, userId, models: deps.models }, recordingId)
    return json({ transcript })
  })
}

export function consultationReportRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db, userId } = await deps.auth(request)
    const { consultationId } = await parseBody(request, z.object({ consultationId: uuid }))
    return json(await draftConsultationReport({ db, userId, models: deps.models }, consultationId))
  })
}

export function patientBriefRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db, userId } = await deps.auth(request)
    const { patientId, force } = await parseBody(request, z.object({ patientId: uuid, force: z.boolean().optional() }))
    return json(await getPatientBrief({ db, userId, models: deps.models }, patientId, { force }))
  })
}
