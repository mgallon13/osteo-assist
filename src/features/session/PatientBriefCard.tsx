import { RefreshCw, Sparkles } from 'lucide-react'
import { Button, Card, CardHeader, ErrorMessage, Spinner } from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { usePatientBrief, useRefreshPatientBrief } from './api'

/** Synthèse à lire en 30 secondes avant de revoir un patient. */
export function PatientBriefCard({ patientId }: { patientId: string }) {
  const brief = usePatientBrief(patientId, true)
  const refresh = useRefreshPatientBrief(patientId)

  const action = (
    <Button size="sm" variant="ghost" onClick={() => refresh.mutate()} loading={refresh.isPending} aria-label="Régénérer la synthèse">
      {!refresh.isPending && <RefreshCw className="size-3.5" />}
    </Button>
  )

  return (
    <Card>
      <CardHeader
        title="Avant la séance"
        description={brief.data?.generatedAt ? `Synthèse IA · ${formatDateTime(brief.data.generatedAt)}` : 'Synthèse IA des séances validées'}
        action={brief.data?.brief ? action : undefined}
      />
      {brief.isPending ? <Spinner label="Préparation de la synthèse…" /> : brief.error ? (
        <div className="p-4"><ErrorMessage error={brief.error} /></div>
      ) : !brief.data.brief ? (
        <p className="px-5 py-4 text-sm text-stone-500">La synthèse apparaîtra après la première séance validée.</p>
      ) : (
        <div className="space-y-4 px-5 py-4 text-sm">
          <p className="flex gap-2 text-stone-800">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden />
            {brief.data.brief.headline}
          </p>

          <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5 rounded-md bg-stone-50 px-3 py-2.5">
            <dt className="text-stone-500">Dernière séance</dt>
            <dd className="col-span-2">{formatDate(brief.data.brief.last_visit.date)} · {brief.data.brief.last_visit.reason ?? '—'}</dd>
            {brief.data.brief.last_visit.treated && (<><dt className="text-stone-500">Traité</dt><dd className="col-span-2">{brief.data.brief.last_visit.treated}</dd></>)}
            {brief.data.brief.last_visit.advice && (<><dt className="text-stone-500">Conseils</dt><dd className="col-span-2">{brief.data.brief.last_visit.advice}</dd></>)}
            {brief.data.brief.last_visit.reference_movement && (<><dt className="text-stone-500">Référence</dt><dd className="col-span-2">{brief.data.brief.last_visit.reference_movement}</dd></>)}
          </dl>

          {brief.data.brief.to_ask.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">À demander</p>
              <ul className="list-disc space-y-0.5 pl-5 text-stone-800">
                {brief.data.brief.to_ask.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
          {brief.data.brief.history_points.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">Historique</p>
              <ul className="space-y-1">
                {brief.data.brief.history_points.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-20 shrink-0 text-xs text-stone-400 tabular-nums">{h.consultation_date ? formatDate(h.consultation_date) : ''}</span>
                    <span className="text-stone-700">{h.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.data.brief.lifestyle.length > 0 && (
            <p className="text-stone-600"><span className="text-stone-500">Hygiène de vie : </span>{brief.data.brief.lifestyle.join(' · ')}</p>
          )}
          {refresh.error && <ErrorMessage error={refresh.error} />}
        </div>
      )}
    </Card>
  )
}
