import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button, Card, ErrorMessage, Field, Input } from '@/components/ui'
import { useAuth } from './AuthProvider'

const schema = z.object({
  password: z.string().min(12, '12 caractères minimum'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: 'Les deux mots de passe diffèrent', path: ['confirm'] })
type FormValues = z.infer<typeof schema>

/** Écran affiché après un clic sur le lien « mot de passe oublié » reçu par e-mail. */
export function ResetPasswordPage() {
  const { endRecovery } = useAuth()
  const [error, setError] = useState<unknown>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) return setError(err)
    window.history.replaceState(null, '', '/')
    endRecovery()
  })

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <p className="mb-6 text-sm text-stone-500">Choisissez le mot de passe que vous utiliserez désormais.</p>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Nouveau mot de passe" htmlFor="password" error={formState.errors.password?.message}>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            </Field>
            <Field label="Confirmation" htmlFor="confirm" error={formState.errors.confirm?.message}>
              <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
            </Field>
            {error != null && <ErrorMessage error={error} />}
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>Enregistrer</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
