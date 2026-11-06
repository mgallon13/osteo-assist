import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader, ErrorMessage, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { RedFlagCheckStatus, RedFlagItem } from '@/types/database'
import { useRedFlagChecks, useRedFlagItems, useSetRedFlagCheck } from './api'

const options: { value: RedFlagCheckStatus; label: string; active: string }[] = [
  { value: 'absent', label: 'Absent', active: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'present', label: 'Présent', active: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'not_assessed', label: 'Non évalué', active: 'bg-stone-100 text-stone-700 border-stone-300' },
]

/**
 * Aide-mémoire générique, identique pour tous les patients.
 * Le praticien coche lui-même : l'outil ne détecte, ne déduit et ne conclut rien.
 */
export function RedFlagChecklist({ consultationId, organizationId, userId, readOnly }: {
  consultationId: string; organizationId: string; userId: string; readOnly?: boolean
}) {
  const items = useRedFlagItems()
  const checks = useRedFlagChecks(consultationId)
  const setCheck = useSetRedFlagCheck(consultationId, organizationId, userId)

  if (items.isPending || checks.isPending) return <Card><Spinner /></Card>
  if (items.error || checks.error) return <ErrorMessage error={items.error ?? checks.error} />

  const statusById = new Map(checks.data.map((c) => [c.item_id, c.status]))
  const byCategory = items.data.reduce<Record<string, RedFlagItem[]>>((acc, item) => {
    ;(acc[item.category] ??= []).push(item)
    return acc
  }, {})
  const assessed = items.data.filter((i) => (statusById.get(i.id) ?? 'not_assessed') !== 'not_assessed').length
  const presentCount = items.data.filter((i) => statusById.get(i.id) === 'present').length
  const unreviewed = items.data.some((i) => !i.clinically_reviewed)

  return (
    <Card>
      <CardHeader
        title="Drapeaux rouges"
        description={`Aide-mémoire · ${assessed}/${items.data.length} évalués`}
        action={presentCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
            <AlertTriangle className="size-3.5" /> {presentCount} signalé{presentCount > 1 ? 's' : ''}
          </span>
        ) : undefined}
      />
      <div className="space-y-4 p-5">
        {unreviewed && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Liste en attente de validation par un référent clinique. Elle ne remplace ni votre examen ni votre jugement.
          </p>
        )}
        {Object.entries(byCategory).map(([category, list]) => (
          <fieldset key={category}>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">{category}</legend>
            <ul className="space-y-2">
              {list.map((item) => {
                const current = statusById.get(item.id) ?? 'not_assessed'
                return (
                  <li key={item.id} className="flex flex-col gap-1.5">
                    <span className={cn('text-sm', current === 'present' ? 'font-medium text-red-700' : 'text-stone-800')}>
                      {item.label}
                    </span>
                    <div className="flex gap-1" role="radiogroup" aria-label={item.label}>
                      {options.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={current === o.value}
                          disabled={readOnly || setCheck.isPending}
                          onClick={() => setCheck.mutate({ itemId: item.id, status: o.value })}
                          className={cn(
                            'rounded border px-2 py-0.5 text-xs transition-colors disabled:cursor-not-allowed',
                            current === o.value ? o.active : 'border-stone-200 text-stone-500 hover:bg-stone-50',
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ))}
        {setCheck.error && <ErrorMessage error={setCheck.error} />}
      </div>
    </Card>
  )
}
