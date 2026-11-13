import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '../../shared/public-config'

const url = import.meta.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_KEY

// Clé publique "anon" uniquement : toute la sécurité repose sur la RLS côté base.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
