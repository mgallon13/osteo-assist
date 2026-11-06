import { Link, useNavigate, useParams } from 'react-router'
import { ExternalLink, FileText, Pencil, Plus } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorMessage, PageHeader, Spinner } from '@/components/ui'
import { ageFrom, formatDate, formatDateTime } from '@/lib/utils'
import { useWorkspace } from '@/features/auth/AuthProvider'
import { useCreateConsultation, usePatientConsultations } from '@/features/consultations/api'
import { usePatient, usePatientClinical } from './api'
import { PatientBriefCard } from '@/features/session/PatientBriefCard'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="col-span-2 whitespace-pre-wrap text-stone-900">{value || '—'}</dd>
    </div>
  )
}

export function PatientDetailPage() {
  const { patientId = '' } = useParams()
  const navigate = useNavigate()
  const { organizationId, canAccessClinical, practitioner } = useWorkspace()
  const patient = usePatient(patientId)
  const clinical = usePatientClinical(patientId, canAccessClinical)
  const consultations = usePatientConsultations(patientId, canAccessClinical)
  const create = useCreateConsultation()

  if (patient.isPending) return <Spinner />
  if (patient.error) return <ErrorMessage error={patient.error} />
  const p = patient.data
  const age = ageFrom(p.birth_date)

  const startConsultation = async () => {
    if (!practitioner) return
    const c = await create.mutateAsync({ organizationId, patientId, practitionerId: practitioner.id })
    navigate(`/consultations/${c.id}`)
  }

  return (
    <>
      <PageHeader
        title={`${p.first_name} ${p.last_name.toUpperCase()}`}
        description={[age != null ? `${age} ans` : null, p.profession].filter(Boolean).join(' · ') || undefined}
        action={
          <div className="flex gap-2">
            {practitioner?.doctolib_url && (
              <a href={practitioner.doctolib_url} target="_blank" rel="noreferrer">
                <Button variant="secondary"><ExternalLink className="size-4" /> Doctolib</Button>
              </a>
            )}
            <Button variant="secondary" onClick={() => navigate(`/patients/${p.id}/modifier`)}>
              <Pencil className="size-4" /> Modifier
            </Button>
            {canAccessClinical && practitioner && (
              <Button onClick={startConsultation} loading={create.isPending}>
                <Plus className="size-4" /> Nouvelle consultation
              </Button>
            )}
          </div>
        }
      />
      {p.is_synthetic && <Badge className="-mt-4 mb-6">Patient fictif</Badge>}
      {create.error && <div className="mb-4"><ErrorMessage error={create.error} /></div>}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Informations" />
            <dl className="divide-y divide-stone-100 px-5 py-2">
              <InfoRow label="Naissance" value={formatDate(p.birth_date)} />
              <InfoRow label="Email" value={p.email} />
              <InfoRow label="Téléphone" value={p.phone} />
              <InfoRow label="Adresse" value={p.address} />
              <InfoRow label="Médecin traitant" value={p.referring_doctor} />
              <InfoRow label="Notes" value={p.admin_notes} />
            </dl>
          </Card>

          {canAccessClinical && (
            <Card>
              <CardHeader title="Antécédents et motifs récurrents" />
              {clinical.isPending ? <Spinner /> : (
                <dl className="divide-y divide-stone-100 px-5 py-2">
                  <InfoRow label="Antécédents" value={clinical.data?.medical_history} />
                  <InfoRow label="Motifs récurrents" value={clinical.data?.recurring_complaints} />
                </dl>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5 lg:col-span-3">
          {canAccessClinical && consultations.data?.some((c) => c.status === 'validated') && (
            <PatientBriefCard patientId={patientId} />
          )}
          {canAccessClinical ? (
            <Card>
              <CardHeader title="Consultations" description="Historique chronologique" />
              {consultations.isPending ? <Spinner /> : consultations.error ? (
                <div className="p-4"><ErrorMessage error={consultations.error} /></div>
              ) : consultations.data.length === 0 ? (
                <EmptyState icon={<FileText className="size-5" />} title="Aucune consultation" description="Démarrez une consultation pour rédiger un premier compte rendu." />
              ) : (
                <ol className="divide-y divide-stone-100">
                  {consultations.data.map((c) => (
                    <li key={c.id}>
                      <Link to={`/consultations/${c.id}`} className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-stone-50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900">{formatDateTime(c.consultation_date)}</p>
                          <p className="mt-0.5 truncate text-sm text-stone-500">{c.reason || 'Motif non renseigné'}</p>
                        </div>
                        {c.status === 'validated'
                          ? <Badge tone="success">Validé</Badge>
                          : <Badge tone="warning">Brouillon</Badge>}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          ) : (
            <Card className="p-5 text-sm text-stone-500">Les consultations sont réservées aux praticiens.</Card>
          )}
        </div>
      </div>
    </>
  )
}
