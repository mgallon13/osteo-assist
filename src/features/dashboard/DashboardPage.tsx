import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText, Sparkles, Users } from 'lucide-react'
import { Badge, Card, CardHeader, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/features/auth/AuthProvider'

interface RecentConsultation {
  id: string
  consultation_date: string
  status: string
  reason: string | null
  patients: { first_name: string; last_name: string } | null
}

export function DashboardPage() {
  const { organizationId, canAccessClinical, practitioner } = useWorkspace()

  const stats = useQuery({
    queryKey: ['dashboard', organizationId],
    queryFn: async () => {
      const patients = await supabase
        .from('patients').select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId).is('archived_at', null)
      if (patients.error) throw patients.error

      if (!canAccessClinical) return { patientCount: patients.count ?? 0, drafts: 0, recent: [], hasProfile: true }

      const [drafts, recent, profile] = await Promise.all([
        supabase.from('consultations').select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId).eq('status', 'draft'),
        supabase.from('consultations')
          .select('id, consultation_date, status, reason, patients(first_name, last_name)')
          .eq('organization_id', organizationId)
          .neq('status', 'cancelled')
          .order('consultation_date', { ascending: false })
          .limit(6)
          .returns<RecentConsultation[]>(),
        practitioner
          ? supabase.from('practitioner_method_profiles').select('completed_at').eq('practitioner_id', practitioner.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])
      for (const r of [drafts, recent, profile]) if (r.error) throw r.error
      return {
        patientCount: patients.count ?? 0,
        drafts: drafts.count ?? 0,
        recent: recent.data ?? [],
        hasProfile: !!profile.data?.completed_at,
      }
    },
  })

  if (stats.isPending) return <Spinner />
  if (stats.error) return <ErrorMessage error={stats.error} />
  const s = stats.data

  return (
    <>
      <PageHeader title={practitioner ? `Bonjour ${practitioner.first_name}` : 'Tableau de bord'} />

      {canAccessClinical && !s.hasProfile && (
        <Link to="/methode" className="mb-5 flex items-center gap-4 rounded-lg border border-accent-100 bg-accent-50 px-5 py-4 hover:border-accent-500">
          <Sparkles className="size-5 shrink-0 text-accent-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-accent-700">Décrivez votre méthode</p>
            <p className="text-sm text-stone-600">15 minutes pour que vos comptes rendus reprennent votre structure et votre vocabulaire.</p>
          </div>
          <ArrowRight className="size-4 text-accent-600" />
        </Link>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <div className="rounded-md bg-stone-100 p-2.5 text-stone-600"><Users className="size-5" /></div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{s.patientCount}</p>
            <p className="text-sm text-stone-500">Patients</p>
          </div>
        </Card>
        {canAccessClinical && (
          <Card className="flex items-center gap-4 p-5">
            <div className="rounded-md bg-amber-50 p-2.5 text-amber-700"><FileText className="size-5" /></div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{s.drafts}</p>
              <p className="text-sm text-stone-500">Comptes rendus à valider</p>
            </div>
          </Card>
        )}
      </div>

      {canAccessClinical && (
        <Card>
          <CardHeader title="Consultations récentes" />
          {s.recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-stone-500">
              Aucune consultation. Ouvrez un <Link to="/patients" className="text-accent-700 hover:underline">dossier patient</Link> pour en démarrer une.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {s.recent.map((c) => (
                <li key={c.id}>
                  <Link to={`/consultations/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-stone-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">
                        {c.patients ? `${c.patients.first_name} ${c.patients.last_name.toUpperCase()}` : 'Patient'}
                      </p>
                      <p className="truncate text-sm text-stone-500">{formatDateTime(c.consultation_date)} · {c.reason || 'Motif non renseigné'}</p>
                    </div>
                    {c.status === 'validated' ? <Badge tone="success">Validé</Badge> : <Badge tone="warning">Brouillon</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  )
}
