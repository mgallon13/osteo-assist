import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, FileSearch, HelpCircle, History, Lightbulb, RefreshCw, Stethoscope, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge, Button, Card, ErrorMessage } from '@/components/ui'
import { callApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { cn, formatDateTime } from '@/lib/utils'
import type { AssistItem, AssistOutput, AssistResult, AssistSource, RedFlagAssistItem } from '../../../shared/assist-schema'

function useLastRun(consultationId: string) {
  return useQuery({
    queryKey: ['assist', consultationId],
    queryFn: async (): Promise<AssistResult | null> => {
      const { data, error } = await supabase.from('practice_assist_runs')
        .select('id, motifs, content, sources, created_at')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; motifs: string[]; content: AssistOutput; sources: AssistSource[]; created_at: string }>()
      if (error) throw error
      return data && { runId: data.id, motifs: data.motifs, content: data.content, sources: data.sources, createdAt: data.created_at, dropped: 0 }
    },
  })
}

const kindStyle: Record<AssistSource['kind'], string> = {
  reference: 'bg-stone-100 text-stone-700',
  case: 'bg-sky-50 text-sky-800',
  pubmed: 'bg-violet-50 text-violet-800',
  method: 'bg-accent-50 text-accent-700',
}

function SourceChips({ ids, sources }: { ids: string[]; sources: Map<string, AssistSource> }) {
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {ids.map((id) => {
        const s = sources.get(id)
        if (!s) return null
        const chip = (
          <span title={`${s.label}${s.detail ? ` — ${s.detail}` : ''}`}
            className={cn('rounded px-1.5 py-px text-[10px] font-medium', kindStyle[s.kind])}>
            {id}
          </span>
        )
        return s.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{chip}</a> : <span key={id}>{chip}</span>
      })}
    </span>
  )
}

function Section({ title, icon: Icon, items, sources, tone }: {
  title: string; icon: ComponentType<{ className?: string }>; items: AssistItem[]; sources: Map<string, AssistSource>; tone?: string
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className={cn('mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase', tone ?? 'text-stone-500')}>
        <Icon className="size-3.5" /> {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm leading-snug text-stone-800">
            {it.text}<SourceChips ids={it.source_ids} sources={sources} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function EmptyHint({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-400 uppercase">
        <Icon className="size-3.5" /> {title}
      </h3>
      <p className="text-sm text-stone-500">{text}</p>
    </section>
  )
}

const flagStatus: Record<RedFlagAssistItem['status'], { label: string; cls: string }> = {
  reported_present: { label: 'Signalé', cls: 'border-red-300 bg-red-50 text-red-800' },
  to_check: { label: 'À vérifier', cls: 'border-amber-200 bg-amber-50 text-amber-900' },
  reported_absent: { label: 'Écarté', cls: 'border-stone-200 bg-white text-stone-500' },
}

/** Aide au praticien : pistes sourcées à partir de l'anamnèse de la séance. */
export function AssistPanel({ consultationId, canRun, beforeRun }: {
  consultationId: string; canRun: boolean; beforeRun?: () => Promise<void>
}) {
  const qc = useQueryClient()
  const last = useLastRun(consultationId)
  const [showSources, setShowSources] = useState(false)
  const run = useMutation({
    mutationFn: async () => {
      await beforeRun?.()   // l'analyse lit la version enregistrée de la consultation
      return callApi<AssistResult>('/api/ai/practice-assist', { consultationId })
    },
    onSuccess: (data) => qc.setQueryData(['assist', consultationId], data),
  })
  const result = last.data
  const sources = new Map((result?.sources ?? []).map((s) => [s.id, s]))
  const order = { reported_present: 0, to_check: 1, reported_absent: 2 } as const
  const flags = [...(result?.content.red_flags ?? [])].sort((a, b) => order[a.status] - order[b.status])

  return (
    <Card className="overflow-hidden border-accent-100">
      <div className="flex items-start justify-between gap-3 border-b border-accent-100 bg-accent-50/60 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Stethoscope className="size-4 text-accent-600" /> Aide au praticien
          </h2>
          <p className="mt-0.5 text-xs text-stone-600">
            {result ? `Analyse du ${formatDateTime(result.createdAt)}${result.motifs.length ? ` · ${result.motifs.join(', ')}` : ''}`
              : 'Pistes sourcées à partir de votre anamnèse. La décision vous appartient.'}
          </p>
        </div>
        {canRun && (
          <Button size="sm" onClick={() => run.mutate()} loading={run.isPending}>
            {!run.isPending && (result ? <RefreshCw className="size-3.5" /> : <Lightbulb className="size-3.5" />)}
            {result ? 'Actualiser' : 'Analyser'}
          </Button>
        )}
      </div>

      <div className="space-y-5 p-5">
        {run.isPending && <p className="text-sm text-stone-500" role="status">Lecture de l’anamnèse, du référentiel, de vos cas et de PubMed…</p>}
        {run.error && <ErrorMessage error={run.error} />}
        {!result && !run.isPending && (
          <p className="text-sm text-stone-500">
            Saisissez le motif et l’anamnèse (notes rapides, dictée ou champs du compte rendu), puis lancez l’analyse.
          </p>
        )}

        {result && (
          <>
            <p className="text-sm text-stone-700 italic">{result.content.summary}</p>

            {flags.length > 0 && (
              <section>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-red-700 uppercase">
                  <AlertTriangle className="size-3.5" /> Drapeaux rouges
                </h3>
                <ul className="space-y-1.5">
                  {flags.map((f, i) => (
                    <li key={i} className={cn('rounded-md border px-3 py-2 text-sm', flagStatus[f.status].cls)}>
                      <span className="mr-1.5 text-[10px] font-semibold tracking-wide uppercase">{flagStatus[f.status].label}</span>
                      {f.text}<SourceChips ids={f.source_ids} sources={sources} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Section title="Questions à compléter" icon={HelpCircle} items={result.content.questions_to_ask} sources={sources} />
            <Section title="Tests à envisager" icon={FileSearch} items={result.content.tests_to_consider} sources={sources} />
            <Section title="Pistes de traitement" icon={Lightbulb} items={result.content.treatment_leads} sources={sources} tone="text-accent-700" />
            <Section title="Si pas d’amélioration" icon={TrendingUp} items={result.content.if_no_improvement} sources={sources} />
            <Section title="Vos cas similaires" icon={History} items={result.content.similar_cases} sources={sources} tone="text-sky-800" />
            {result.content.similar_cases.length === 0 && (
              <EmptyHint icon={History} title="Vos cas similaires" text="Aucun cas comparable parmi vos séances validées." />
            )}
            <Section title="Ce que dit la littérature" icon={BookOpen} items={result.content.evidence} sources={sources} tone="text-violet-800" />
            {result.content.evidence.length === 0 && (
              <EmptyHint icon={BookOpen} title="Ce que dit la littérature"
                text="Aucune publication de haut niveau de preuve retrouvée sur PubMed pour ce cas." />
            )}

            <div className="border-t border-stone-100 pt-3">
              <button type="button" onClick={() => setShowSources(!showSources)} className="text-xs font-medium text-stone-600 hover:text-stone-900">
                {showSources ? 'Masquer' : 'Afficher'} les {result.sources.length} sources
              </button>
              {showSources && (
                <ul className="mt-2 space-y-1.5">
                  {result.sources.map((s) => (
                    <li key={s.id} className="flex gap-2 text-xs">
                      <span className={cn('h-fit shrink-0 rounded px-1.5 py-px font-medium', kindStyle[s.kind])}>{s.id}</span>
                      <span className="text-stone-700">
                        {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.label} <ExternalLink className="inline size-3" /></a> : s.label}
                        {s.detail && <span className="block text-stone-500">{s.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-xs text-stone-500">
              <CheckCircle2 className="mt-px size-3.5 shrink-0" />
              Suggestions issues des sources citées, sans valeur de diagnostic. Le référentiel de départ est en attente de validation clinique.
            </p>
            {result.dropped > 0 && <Badge>{result.dropped} suggestion(s) retirée(s) faute de source</Badge>}
          </>
        )}
      </div>
    </Card>
  )
}
