import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from './config.js'
import { HttpError } from './http.js'

export interface AuthContext {
  /** Client agissant AU NOM de l'utilisateur : toutes les requêtes passent par la RLS. */
  db: SupabaseClient
  userId: string
}

export type Authenticator = (request: Request) => Promise<AuthContext>

/**
 * Vérifie le jeton de session Supabase et renvoie un client limité aux droits
 * de l'utilisateur. Aucune clé « service role » n'est utilisée par les endpoints IA :
 * un identifiant de patient ou de consultation transmis par le client ne donne
 * accès à rien que la RLS n'autorise déjà.
 */
export const authenticate: Authenticator = async (request) => {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new HttpError(401, 'Non authentifié')

  const db = createClient(config.supabaseUrl(), config.supabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Session invalide')
  return { db, userId: data.user.id }
}
