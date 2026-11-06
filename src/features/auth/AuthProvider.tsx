import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Membership, Practitioner } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  sessionLoading: boolean
  membership: Membership | null
  practitioner: Practitioner | null
  workspaceLoading: boolean
  refetchWorkspace: () => Promise<unknown>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  // MVP : un utilisateur = un cabinet. Le schéma supporte plusieurs cabinets,
  // l'interface de sélection viendra si le besoin est confirmé.
  const workspace = useQuery({
    queryKey: ['workspace', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: membership, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', userId!)
        .order('created_at')
        .limit(1)
        .maybeSingle<Membership>()
      if (error) throw error
      if (!membership) return { membership: null, practitioner: null }

      const { data: practitioner, error: pErr } = await supabase
        .from('practitioners')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .eq('user_id', userId!)
        .maybeSingle<Practitioner>()
      if (pErr) throw pErr
      return { membership, practitioner }
    },
  })

  const value: AuthContextValue = {
    session,
    sessionLoading,
    membership: workspace.data?.membership ?? null,
    practitioner: workspace.data?.practitioner ?? null,
    workspaceLoading: !!userId && workspace.isPending,
    refetchWorkspace: workspace.refetch,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}

/** Contexte garanti dans les pages protégées (après onboarding). */
export function useWorkspace() {
  const { membership, practitioner } = useAuth()
  if (!membership) throw new Error('Aucun cabinet chargé')
  return {
    organizationId: membership.organization_id,
    organization: membership.organizations,
    role: membership.role,
    practitioner,
    canAccessClinical: membership.role !== 'staff',
  }
}
