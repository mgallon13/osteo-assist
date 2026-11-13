import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorMessage, Field, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth, useWorkspace } from '@/features/auth/AuthProvider'

interface Card {
  id: string
  organization_id: string | null
  motif: string
  section: string
  content: string
  source_label: string
  validated: boolean
}

const SECTIONS: Record<string, string> = {
  key_questions: 'Questions clés',
  red_flags: 'Signes d’alerte',
  tests: 'Tests',
  approach: 'Approche',
  adaptations: 'Adaptations',
  if_no_improvement: 'Si pas d’amélioration',
  advice: 'Conseils',
}

function AddCardForm({ motifs, onDone }: { motifs: string[]; onDone: () => void }) {
  const { organizationId } = useWorkspace()
  const { session } = useAuth()
  const qc = useQueryClient()
  const [motif, setMotif] = useState(motifs[0] ?? '')
  const [section, setSection] = useState('approach')
  const [content, setContent] = useState('')
  const add = useMutation({
    mutationFn: async () => {
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => (l.startsWith('- ') ? l : `- ${l}`))
      const { error } = await supabase.from('reference_cards').insert({
        organization_id: organizationId, motif: motif.trim(), section, content: lines.join('\n'),
        source_label: 'Fiche du cabinet', validated: true, created_by: session?.user.id, sort_order: 1000,
        keywords: [motif.trim().toLowerCase()],
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reference-cards'] }); onDone() },
  })
  return (
    <Card className="mb-5 max-w-2xl">
      <CardHeader title="Ajouter une fiche du cabinet" description="Elle sera utilisée par l’aide au praticien, pour votre cabinet uniquement." />
      <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Motif" htmlFor="motif" hint="Choisissez un motif existant ou saisissez-en un nouveau.">
            <Input id="motif" list="motifs" value={motif} onChange={(e) => setMotif(e.target.value)} required />
            <datalist id="motifs">{motifs.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Rubrique" htmlFor="section">
            <Select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
              {Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Contenu" htmlFor="content" hint="Une idée par ligne.">
          <Textarea id="content" rows={5} value={content} onChange={(e) => setContent(e.target.value)} required />
        </Field>
        {add.error && <ErrorMessage error={add.error} />}
        <div className="flex gap-2">
          <Button type="submit" loading={add.isPending}>Ajouter</Button>
          <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
        </div>
      </form>
    </Card>
  )
}

export function ReferencePage() {
  const [active, setActive] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const cards = useQuery({
    queryKey: ['reference-cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reference_cards')
        .select('id, organization_id, motif, section, content, source_label, validated')
        .order('sort_order').returns<Card[]>()
      if (error) throw error
      return data
    },
  })

  if (cards.isPending) return <Spinner />
  if (cards.error) return <ErrorMessage error={cards.error} />
  const motifs = [...new Set(cards.data.map((c) => c.motif))]
  const current = active ?? motifs[0] ?? null
  const shown = cards.data.filter((c) => c.motif === current)

  return (
    <>
      <PageHeader
        title="Référentiel de pratiques"
        description="Les fiches sur lesquelles s’appuie l’aide au praticien. Le référentiel commun est en attente de validation clinique."
        action={!adding && <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Fiche du cabinet</Button>}
      />
      {adding && <AddCardForm motifs={motifs.filter((m) => m !== 'Transversal')} onDone={() => setAdding(false)} />}

      <div className="flex flex-col gap-5 md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col" aria-label="Motifs">
          {motifs.map((m) => (
            <button key={m} type="button" onClick={() => setActive(m)}
              className={cn('rounded-md px-3 py-1.5 text-left text-sm whitespace-nowrap',
                m === current ? 'bg-accent-50 font-medium text-accent-700' : 'text-stone-600 hover:bg-stone-100')}>
              {m}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 space-y-4">
          {shown.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3">
                <h2 className="text-sm font-semibold">{SECTIONS[c.section] ?? c.section}</h2>
                <span className="flex items-center gap-2 text-xs text-stone-500">
                  {c.organization_id ? <Badge tone="accent">Cabinet</Badge> : c.source_label}
                  {!c.validated && <Badge tone="warning">À valider</Badge>}
                </span>
              </div>
              <ul className="list-disc space-y-1 py-3 pr-5 pl-10 text-sm text-stone-800">
                {c.content.split('\n').map((l, i) => <li key={i}>{l.replace(/^-\s*/, '')}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
