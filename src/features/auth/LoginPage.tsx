import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button, Card, ErrorMessage, Field, Input } from '@/components/ui'

const schema = z.object({
  email: z.email('Adresse email invalide'),
  password: z.string().min(12, '12 caractères minimum'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const [error, setError] = useState<unknown>(null)
  const { register, handleSubmit, formState, getValues } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const [resetSent, setResetSent] = useState(false)
  const forgot = async () => {
    setError(null)
    const email = getValues('email')
    if (!email || !email.includes('@')) return setError(new Error('Saisissez d’abord votre adresse e-mail ci-dessus.'))
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (err) return setError(err)
    setResetSent(true)
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err)
  })

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-accent-600 text-lg font-semibold text-white">
            O
          </div>
          <h1 className="text-xl font-semibold tracking-tight">OstéoAssist</h1>
          <p className="mt-1 text-sm text-stone-500">
            Connectez-vous à votre cabinet
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
            </Field>
            <Field label="Mot de passe" htmlFor="password" error={formState.errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            </Field>
            {error != null && <ErrorMessage error={error} />}
            {resetSent && (
              <p className="rounded-md bg-accent-50 px-3 py-2 text-sm text-accent-700">
                Si cette adresse a été invitée, un lien pour choisir votre mot de passe vient d’être envoyé. Pensez à vérifier les spams.
              </p>
            )}
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>
              Se connecter
            </Button>
            <button type="button" onClick={forgot} className="w-full text-center text-sm text-stone-500 hover:text-stone-900 hover:underline">
              Première connexion ou mot de passe oublié ?
            </button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-stone-500">
          L’accès se fait sur invitation. Invité ? Saisissez votre e-mail puis « Première connexion ».
        </p>
      </div>
    </div>
  )
}
