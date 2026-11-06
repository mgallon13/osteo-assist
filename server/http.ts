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
      console.error('[api] erreur inattendue', e instanceof Error ? e.message : e)
      return json({ error: 'Erreur interne' }, 500)
    }
  }
}
