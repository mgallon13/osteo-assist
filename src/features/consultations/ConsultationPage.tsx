import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CheckCircle2, History, Save } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorMessage, Field, Input, PageHeader, Spinner, Textarea } from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useAuth, useWorkspace } from '@/features/auth/AuthProvider'
import { usePatient } from '@/features/patients/api'
import { RedFlagChecklist } from '@/features/red-flags/RedFlagChecklist'
import {
  originLabels, reportFields, useConsultation, usePatientConsultations, useSaveConsultation,
  useValidateConsultation, type ReportValues,
} from './api'

export function ConsultationPage() {
  const { consultationId = '' } = useParams()
  const { session } = useAuth()
  const { organizationId, practitioner } = useWorkspace()
  const consultation = useConsultation(consultationId)
  const patientId = consultation.data?.patient_id ?? ''
  const patient = usePatient(patientId)
  const history = usePatientConsultations(patientId, !!patientId)
  const save = useSaveConsultation(consultationId)
  const validate = useValidateConsultation(consultationId)
  const [confirming, setConfirming] = useState(false)

  const { register, handleSubmit, reset, formState } = useForm<ReportValues>()

  useEffect(() => {
    const c = consultation.data
    if (!c) return
    reset({
      ...Object.fromEntries(reportFields.map((f) => [f.key, c[f.key] ?? ''])),
      suggested_follow_up_date: c.suggested_follow_up_date ?? '',
    } as ReportValues)
  }, [consultation.data, reset])

  if (consultation.isPending) return <Spinner />
  if (consultation.error) return <ErrorMessage error={consultation.error} />
  const c = consultation.data
  const isAuthor = practitioner?.id === c.practitioner_id
  const isValidated = c.status === 'validated'
  const previous = (history.data ?? []).filter((h) => h.id !== c.id && h.consultation_date < c.consultation_date).slice(0, 3)

  const onSave = handleSubmit(async (values) => {
    await save.mutateAsync(values)
    reset(values)
  })

  const onValidate = handleSubmit(async (values) => {
    if (formState.isDirty) await save.mutateAsync(values)
    await validate.mutateAsync()
    setConfirming(false)
  })

  return (
    <>
      <Link to={`/patients/${c.patient_id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="size-4" /> {patient.data ? `${patient.data.first_name} ${patient.data.last_name.toUpperCase()}` : 'Patient'}
      </Link>
      <PageHeader
        title="Consultation"
        description={formatDateTime(c.consultation_date)}
        action={isValidated
          ? <Badge tone="success"><CheckCircle2 className="size-3.5" /> Validé le {formatDate(c.validated_at)}</Badge>
          : <Badge tone="warning">Brouillon</Badge>}
      />

      {!isAuthor && (
        <p className="mb-4 rounded-md bg-stone-100 px-4 py-2.5 text-sm text-stone-600">
          Consultation d'un autre praticien : lecture seule.
        </p>
      )}
      {isValidated && isAuthor && (
        <p className="mb-4 rounded-md bg-stone-100 px-4 py-2.5 text-sm text-stone-600">
          Ce compte rendu est validé. Toute modification est possible mais tracée : la version précédente est archivée.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={onSave} className="space-y-5 lg:col-span-2" noValidate>
          <Card>
            <CardHeader title="Compte rendu" description="Chaque section indique l'origine de l'information." />
            <fieldset disabled={!isAuthor} className="space-y-5 p-5">
              {reportFields.map((f) => (
                <div key={f.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor={f.key} className="text-sm font-medium text-stone-700">{f.label}</label>
                    <span className="text-xs text-stone-400">{originLabels[f.origin]}</span>
                  </div>
                  <Textarea id={f.key} rows={f.key === 'reason' ? 2 : 3} {...register(f.key)} />
                </div>
              ))}
              <div className="max-w-xs">
                <Field label="Date de suivi envisagée" htmlFor="suggested_follow_up_date" hint="Décidée par vous. Aucun envoi automatique.">
                  <Input id="suggested_follow_up_date" type="date" {...register('suggested_follow_up_date')} />
                </Field>
              </div>
            </fieldset>
          </Card>

          {(save.error || validate.error) && <ErrorMessage error={save.error ?? validate.error} />}

          {isAuthor && (
            <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-2 border-t border-stone-200 bg-stone-50/95 px-1 py-3 backdrop-blur">
              <Button type="submit" variant="secondary" loading={save.isPending && !confirming} disabled={!formState.isDirty}>
                <Save className="size-4" /> {formState.isDirty ? 'Enregistrer' : 'Enregistré'}
              </Button>
              {!isValidated && !confirming && (
                <Button type="button" onClick={() => setConfirming(true)}>
                  <CheckCircle2 className="size-4" /> Valider le compte rendu
                </Button>
              )}
              {confirming && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-accent-100 bg-white px-3 py-2">
                  <span className="text-sm text-stone-700">J'ai relu ce compte rendu et j'en assume le contenu.</span>
                  <Button type="button" size="sm" onClick={onValidate} loading={validate.isPending}>Confirmer</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>Annuler</Button>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="space-y-5">
          <RedFlagChecklist
            consultationId={c.id}
            organizationId={organizationId}
            userId={session?.user.id ?? ''}
            readOnly={!isAuthor}
          />

          <Card>
            <CardHeader title="Séances précédentes" />
            {history.isPending ? <Spinner /> : previous.length === 0 ? (
              <p className="px-5 py-4 text-sm text-stone-500">Première consultation.</p>
            ) : (
              <ol className="divide-y divide-stone-100">
                {previous.map((h) => (
                  <li key={h.id} className="px-5 py-3">
                    <Link to={`/consultations/${h.id}`} className="group block">
                      <p className="flex items-center gap-1.5 text-xs text-stone-500">
                        <History className="size-3.5" /> {formatDate(h.consultation_date)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-stone-900 group-hover:text-accent-700">{h.reason || 'Motif non renseigné'}</p>
                      {h.techniques_performed && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{h.techniques_performed}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
