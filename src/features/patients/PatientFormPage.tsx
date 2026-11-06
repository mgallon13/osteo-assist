import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Card, CardHeader, ErrorMessage, Field, Input, PageHeader, Spinner, Textarea } from '@/components/ui'
import { useWorkspace } from '@/features/auth/AuthProvider'
import { patientSchema, usePatient, usePatientClinical, useSavePatient, type PatientFormValues } from './api'

export function PatientFormPage() {
  const { patientId } = useParams()
  const isEdit = !!patientId
  const navigate = useNavigate()
  const { organizationId, canAccessClinical } = useWorkspace()

  const patient = usePatient(patientId ?? '')
  const clinical = usePatientClinical(patientId ?? '', isEdit && canAccessClinical)
  const save = useSavePatient(organizationId, canAccessClinical)

  const { register, handleSubmit, reset, formState } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { is_synthetic: true },
  })

  useEffect(() => {
    if (!isEdit || !patient.data) return
    const p = patient.data
    reset({
      first_name: p.first_name,
      last_name: p.last_name,
      birth_date: p.birth_date ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      address: p.address ?? '',
      profession: p.profession ?? '',
      referring_doctor: p.referring_doctor ?? '',
      admin_notes: p.admin_notes ?? '',
      medical_history: clinical.data?.medical_history ?? '',
      recurring_complaints: clinical.data?.recurring_complaints ?? '',
      is_synthetic: true,
    })
  }, [isEdit, patient.data, clinical.data, reset])

  if (isEdit && (patient.isPending || (canAccessClinical && clinical.isPending))) return <Spinner />
  if (isEdit && patient.error) return <ErrorMessage error={patient.error} />

  const onSubmit = handleSubmit(async (values) => {
    const saved = await save.mutateAsync({ id: patientId, values })
    navigate(`/patients/${saved.id}`)
  })

  const err = formState.errors

  return (
    <>
      <PageHeader title={isEdit ? 'Modifier le patient' : 'Nouveau patient'} />
      <form onSubmit={onSubmit} className="max-w-3xl space-y-5" noValidate>
        <Card>
          <CardHeader title="Identité et contact" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="first_name" error={err.first_name?.message}>
              <Input id="first_name" {...register('first_name')} />
            </Field>
            <Field label="Nom" htmlFor="last_name" error={err.last_name?.message}>
              <Input id="last_name" {...register('last_name')} />
            </Field>
            <Field label="Date de naissance" htmlFor="birth_date">
              <Input id="birth_date" type="date" {...register('birth_date')} />
            </Field>
            <Field label="Profession" htmlFor="profession">
              <Input id="profession" {...register('profession')} />
            </Field>
            <Field label="Email" htmlFor="email" error={err.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Field>
            <Field label="Téléphone" htmlFor="phone">
              <Input id="phone" type="tel" {...register('phone')} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adresse" htmlFor="address">
                <Input id="address" {...register('address')} />
              </Field>
            </div>
            <Field label="Médecin traitant" htmlFor="referring_doctor">
              <Input id="referring_doctor" {...register('referring_doctor')} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes administratives" htmlFor="admin_notes" hint="Visibles par le secrétariat. Pas d'information médicale ici.">
                <Textarea id="admin_notes" {...register('admin_notes')} />
              </Field>
            </div>
          </div>
        </Card>

        {canAccessClinical && (
          <Card>
            <CardHeader title="Informations cliniques" description="Réservées aux praticiens du cabinet." />
            <div className="space-y-4 p-5">
              <Field label="Antécédents" htmlFor="medical_history">
                <Textarea id="medical_history" rows={4} {...register('medical_history')} />
              </Field>
              <Field label="Motifs récurrents" htmlFor="recurring_complaints">
                <Textarea id="recurring_complaints" rows={3} {...register('recurring_complaints')} />
              </Field>
            </div>
          </Card>
        )}

        <label className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <input type="checkbox" className="mt-0.5" {...register('is_synthetic')} />
          <span>Je confirme qu'il s'agit d'un patient <strong>fictif</strong>. Aucune donnée réelle tant que l'hébergement certifié HDS n'est pas en place.</span>
        </label>
        {err.is_synthetic && <p className="text-xs text-red-600">{err.is_synthetic.message}</p>}

        {save.error && <ErrorMessage error={save.error} />}

        <div className="flex gap-2">
          <Button type="submit" loading={formState.isSubmitting}>Enregistrer</Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Annuler</Button>
        </div>
      </form>
    </>
  )
}
