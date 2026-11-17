// Définition des routes IA, indépendante de l'hébergement (Vercel ou serveur de dev).
import { z } from 'zod'
import { authenticate, type Authenticator } from './auth.js'
import { gatewayModels, type ModelProvider } from './ai/models.js'
import { draftConsultationReport, getPatientBrief, transcribeRecording } from './ai/features.js'
import { runPracticeAssist } from './ai/assist.js'
import type { Fetcher } from './ai/pubmed.js'
import { invoicePdf, resendMailer, sendInvoice, sendReminder, type Mailer } from './billing/service.js'
import { handler, json, parseBody } from './http.js'

export interface RouteDeps {
  auth: Authenticator
  models: ModelProvider
  fetcher?: Fetcher
  mailer?: Mailer
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

export function practiceAssistRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db, userId } = await deps.auth(request)
    const { consultationId } = await parseBody(request, z.object({ consultationId: uuid }))
    return json(await runPracticeAssist({ db, userId, models: deps.models, fetcher: deps.fetcher }, consultationId))
  })
}

export function invoicePdfRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db } = await deps.auth(request)
    const { invoiceId } = await parseBody(request, z.object({ invoiceId: uuid }))
    const { bytes, filename } = await invoicePdf(db, invoiceId)
    return new Response(bytes as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    })
  })
}

export function sendInvoiceRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db, userId } = await deps.auth(request)
    const { invoiceId } = await parseBody(request, z.object({ invoiceId: uuid }))
    return json(await sendInvoice(db, userId, invoiceId, deps.mailer ?? resendMailer))
  })
}

export function sendReminderRoute(deps: RouteDeps = defaults) {
  return handler(async (request) => {
    const { db, userId } = await deps.auth(request)
    const body = await parseBody(request, z.object({
      reminderId: uuid,
      subject: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(5000),
    }))
    return json(await sendReminder(db, userId, body.reminderId, body, deps.mailer ?? resendMailer))
  })
}
