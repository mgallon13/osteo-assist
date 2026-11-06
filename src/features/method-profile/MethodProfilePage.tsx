import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Info } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorMessage, Input, PageHeader, Spinner, Textarea } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/features/auth/AuthProvider'
import type { MethodProfile } from '@/types/database'
import { QUESTIONNAIRE_VERSION, allQuestions, sections, type Question } from './questions'

type Answers = Record<string, string | string[]>

function QuestionInput({ q, value, onChange }: { q: Question; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  if (q.type === 'text') {
    return <Textarea id={q.id} rows={3} placeholder={q.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
  }
  const selected = Array.isArray(value) ? value : value ? [value] : []
  return (
    <div className="flex flex-wrap gap-2" role={q.type === 'single' ? 'radiogroup' : 'group'} aria-labelledby={`${q.id}-label`}>
      {q.options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            role={q.type === 'single' ? 'radio' : 'checkbox'}
            aria-checked={active}
            onClick={() => {
              if (q.type === 'single') onChange(opt)
              else onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              active ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-stone-200 text-stone-700 hover:bg-stone-50',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function MethodProfilePage() {
  const { practitioner } = useWorkspace()

  const profile = useQuery({
    queryKey: ['method-profile', practitioner?.id],
    enabled: !!practitioner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practitioner_method_profiles')
        .select('*')
        .eq('practitioner_id', practitioner!.id)
        .maybeSingle<MethodProfile>()
      if (error) throw error
      return data
    },
  })

  if (!practitioner) return <ErrorMessage error={new Error('Profil praticien introuvable')} />
  if (profile.isPending) return <Spinner />
  if (profile.error) return <ErrorMessage error={profile.error} />
  return <MethodProfileForm practitionerId={practitioner.id} profile={profile.data} />
}

function MethodProfileForm({ practitionerId, profile }: { practitionerId: string; profile: MethodProfile | null }) {
  const { organizationId } = useWorkspace()
  const qc = useQueryClient()
  const [answers, setAnswers] = useState<Answers>(() => profile?.answers ?? {})
  const [dirty, setDirty] = useState(false)

  const answeredCount = allQuestions.filter((q) => {
    const v = answers[q.id]
    return Array.isArray(v) ? v.length > 0 : !!v?.trim()
  }).length
  const complete = answeredCount === allQuestions.length

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('practitioner_method_profiles').upsert(
        {
          organization_id: organizationId,
          practitioner_id: practitionerId,
          questionnaire_version: QUESTIONNAIRE_VERSION,
          answers,
          completed_at: complete ? new Date().toISOString() : null,
        },
        { onConflict: 'practitioner_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['method-profile', practitionerId] })
    },
  })

  const update = (id: string, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: v }))
    setDirty(true)
  }

  return (
    <>
      <PageHeader
        title="Ma méthode"
        description="Une quinzaine de minutes pour que vos comptes rendus soient rédigés comme vous les écririez."
        action={profile?.completed_at
          ? <Badge tone="success"><CheckCircle2 className="size-3.5" /> Complété le {formatDate(profile.completed_at)}</Badge>
          : <Badge>{answeredCount}/{allQuestions.length} réponses</Badge>}
      />

      <div className="mb-5 flex max-w-3xl gap-3 rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden />
        <p>
          Ces réponses servent uniquement à adapter la <strong>rédaction</strong> (structure, vocabulaire, niveau de détail).
          Elles ne sont jamais utilisées pour vous proposer un test ou une technique. Elles restent privées : même les autres
          membres de votre cabinet n'y ont pas accès.
        </p>
      </div>

      <div className="max-w-3xl space-y-5">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader title={section.title} description={section.description} />
            <div className="space-y-6 p-5">
              {section.questions.map((q) => (
                <div key={q.id}>
                  <label id={`${q.id}-label`} htmlFor={q.id} className="mb-1 block text-sm font-medium text-stone-800">{q.label}</label>
                  {q.help && <p className="mb-2 text-xs text-stone-500">{q.help}</p>}
                  {!q.help && <div className="mb-2" />}
                  <QuestionInput q={q} value={answers[q.id]} onChange={(v) => update(q.id, v)} />
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card className="p-5">
          <label htmlFor="free_notes" className="mb-1 block text-sm font-medium text-stone-800">Autre chose à savoir sur votre façon de documenter ?</label>
          <Input id="free_notes" value={(answers.free_notes as string) ?? ''} onChange={(e) => update('free_notes', e.target.value)} />
        </Card>

        {save.error && <ErrorMessage error={save.error} />}
        <div className="sticky bottom-0 border-t border-stone-200 bg-stone-50/95 py-3 backdrop-blur">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
            {dirty ? 'Enregistrer mes réponses' : 'Réponses enregistrées'}
          </Button>
        </div>
      </div>
    </>
  )
}
