import { supabase } from './supabase'

async function post(path: string, body: unknown, token: string) {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

/**
 * Appel d'un endpoint /api avec le jeton de session de l'utilisateur.
 * Si le serveur juge la session expirée (401), on rafraîchit le jeton et on réessaie
 * une fois ; si ça échoue encore, on déconnecte pour forcer une reconnexion propre.
 */
export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnectez-vous.')

  let res = await post(path, body, token)
  if (res.status === 401) {
    const refreshed = await supabase.auth.refreshSession()
    const fresh = refreshed.data.session?.access_token
    if (!fresh) {
      await supabase.auth.signOut()
      throw new Error('Votre session a expiré. Reconnectez-vous.')
    }
    res = await post(path, body, fresh)
  }

  const payload = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(payload.error ?? `Erreur ${res.status}`)
  return payload as T
}
