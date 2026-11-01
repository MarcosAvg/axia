import { formatDateTime } from '@/lib/format'
import type { DuplicateCandidate } from '../domain/types'
import { statusLabels, ticketMessages } from '../i18n'

const { create } = ticketMessages

function valueText(key: string, value: unknown): string {
  if (key === 'reported_at' && typeof value === 'string') {
    return formatDateTime(value)
  }
  if (key === 'status' && typeof value === 'string') {
    return statusLabels[value as keyof typeof statusLabels] ?? value
  }
  return String(value)
}

/** Campos configurados y nivel de coincidencia de un candidato a duplicado. */
export function DuplicateCandidateDetails({
  candidate,
}: {
  candidate: DuplicateCandidate
}) {
  const entries = Object.entries(create.duplicateFields).filter(([key]) => {
    const value = candidate[key as keyof DuplicateCandidate]
    return (
      key !== 'folio' &&
      key !== 'status' &&
      value !== null &&
      value !== undefined &&
      value !== ''
    )
  })
  const percent = Math.round(candidate.score * 100)
  const reasons = candidate.reasons
    .map((reason) => create.duplicateReasons[reason])
    .filter(Boolean)
  return (
    <>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-sm">
        {entries.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">
              {valueText(key, candidate[key as keyof DuplicateCandidate])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {create.duplicateMatch(percent)}
        {reasons.length > 0 ? ` · ${reasons.join(', ')}` : ''}
      </p>
    </>
  )
}
