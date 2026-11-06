import { supabase } from './supabase'

/** Appel d'un endpoint /api avec le jeton de session de l'utilisateur. */
export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnectez-vous.')

  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const payload = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(payload.error ?? `Erreur ${res.status}`)
  return payload as T
}
