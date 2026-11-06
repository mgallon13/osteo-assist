import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button, Card, ErrorMessage, Field, Input } from '@/components/ui'
import { useAuth } from './AuthProvider'

const schema = z.object({
  firstName: z.string().trim().min(1, 'Requis'),
  lastName: z.string().trim().min(1, 'Requis'),
  orgName: z.string().trim().min(1, 'Requis').max(200),
})
type FormValues = z.infer<typeof schema>

export function OnboardingPage() {
  const { refetchWorkspace, signOut } = useAuth()
  const [error, setError] = useState<unknown>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    const { error: err } = await supabase.rpc('create_organization_with_owner', {
      org_name: v.orgName,
      practitioner_first_name: v.firstName,
      practitioner_last_name: v.lastName,
    })
    if (err) return setError(err)
    await refetchWorkspace()
  })

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold tracking-tight">Bienvenue</h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">Quelques informations pour créer votre cabinet.</p>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" htmlFor="firstName" error={formState.errors.firstName?.message}>
                <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
              </Field>
              <Field label="Nom" htmlFor="lastName" error={formState.errors.lastName?.message}>
                <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
              </Field>
            </div>
            <Field label="Nom du cabinet" htmlFor="orgName" error={formState.errors.orgName?.message}>
              <Input id="orgName" placeholder="Cabinet d'ostéopathie…" {...register('orgName')} />
            </Field>
            {error != null && <ErrorMessage error={error} />}
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>
              Créer mon cabinet
            </Button>
          </form>
        </Card>
        <button type="button" onClick={signOut} className="mt-4 w-full text-center text-sm text-stone-500 hover:underline">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
