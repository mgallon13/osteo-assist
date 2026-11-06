import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus, Search, Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorMessage, Input, PageHeader, Spinner } from '@/components/ui'
import { ageFrom, formatDate } from '@/lib/utils'
import { useWorkspace } from '@/features/auth/AuthProvider'
import { usePatients } from './api'

export function PatientsPage() {
  const { organizationId } = useWorkspace()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search)
  const { data, isPending, error } = usePatients(organizationId, deferred)

  return (
    <>
      <PageHeader
        title="Patients"
        description="Dossiers de votre cabinet"
        action={
          <Button onClick={() => navigate('/patients/nouveau')}>
            <Plus className="size-4" /> Nouveau patient
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <Input
          placeholder="Rechercher par nom ou email…"
          aria-label="Rechercher un patient"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        {isPending ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorMessage error={error} /></div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={search ? 'Aucun patient trouvé' : 'Aucun patient pour le moment'}
            description={search ? 'Essayez un autre nom.' : 'Créez un premier patient fictif pour tester le parcours.'}
            action={!search && <Button onClick={() => navigate('/patients/nouveau')}><Plus className="size-4" /> Nouveau patient</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 bg-stone-50/60 text-left text-xs font-medium text-stone-500">
                <tr>
                  <th className="px-5 py-2.5">Patient</th>
                  <th className="px-5 py-2.5">Âge</th>
                  <th className="px-5 py-2.5">Contact</th>
                  <th className="px-5 py-2.5">Séances</th>
                  <th className="px-5 py-2.5">Dernière séance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3">
                      <Link to={`/patients/${p.id}`} className="font-medium text-stone-900 hover:text-accent-700">
                        {p.last_name.toUpperCase()} {p.first_name}
                      </Link>
                      {p.is_synthetic && <Badge className="ml-2">Fictif</Badge>}
                    </td>
                    <td className="px-5 py-3 text-stone-600">{ageFrom(p.birth_date) ?? '—'}</td>
                    <td className="px-5 py-3 text-stone-600">{p.email ?? p.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-stone-600">{p.consultation_count}</td>
                    <td className="px-5 py-3 text-stone-600">{formatDate(p.last_consultation_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
