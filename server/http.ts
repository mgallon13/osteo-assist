import { z } from 'zod'

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new HttpError(400, 'Corps de requête JSON invalide')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new HttpError(400, 'Paramètres invalides')
  return parsed.data
}

/** Remonte à l'erreur d'origine (le SDK IA enveloppe les échecs après nouvelles tentatives). */
function rootError(e: unknown): unknown {
  let cur = e
  for (let i = 0; i < 5 && cur && typeof cur === 'object'; i++) {
    const o = cur as { name?: string; lastError?: unknown; cause?: unknown }
    if (o.name === 'AI_RetryError' && o.lastError) cur = o.lastError
    else if (o.name === 'AI_NoObjectGeneratedError' || /^Gateway/.test(o.name ?? '')) return cur
    else if (o.cause && typeof o.cause === 'object') cur = o.cause
    else break
  }
  return cur
}

/**
 * Traduit les erreurs connues (configuration, AI Gateway, sortie du modèle) en
 * message exploitable par le praticien, sans jamais renvoyer de donnée patient.
 */
export function explainError(e: unknown): HttpError | null {
  const root = rootError(e) as { name?: string; message?: string }
  const name = root?.name ?? ''
  const message = root?.message ?? ''
  if (message.startsWith('Variable d\'environnement manquante')) return new HttpError(503, `Configuration serveur incomplète. ${message}`)
  switch (name) {
    case 'GatewayAuthenticationError':
      return new HttpError(503, 'Clé AI Gateway absente ou invalide : vérifiez AI_GATEWAY_API_KEY dans .env.local, puis relancez npm run dev.')
    case 'GatewayForbiddenError':
      return new HttpError(503, 'AI Gateway refuse l’appel : vérifiez le crédit ou le moyen de paiement dans Vercel > AI Gateway.')
    case 'GatewayModelNotFoundError':
      return new HttpError(503, 'Modèle IA introuvable dans AI Gateway : vérifiez les variables AI_MODEL_*.')
    case 'GatewayRateLimitError':
      return new HttpError(429, 'Trop de requêtes vers l’IA. Réessayez dans une minute.')
    case 'AI_NoObjectGeneratedError':
      return new HttpError(502, 'La réponse de l’IA n’a pas pu être lue. Réessayez.')
  }
  if (/^Gateway/.test(name)) return new HttpError(502, `Erreur AI Gateway (${name}). Réessayez.`)
  return null
}

/**
 * Enveloppe commune : erreurs maîtrisées → statut HTTP, erreurs inattendues → 500
 * sans divulguer de détail (ni donnée patient) au client.
 */
export function handler(fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(request)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      const known = explainError(e)
      const root = rootError(e) as { name?: string; message?: string }
      console.error('[api] erreur', root?.name ?? '', root?.message ?? e)
      if (known) return json({ error: known.message }, known.status)
      return json({ error: 'Erreur interne (détail dans la fenêtre PowerShell)' }, 500)
    }
  }
}
