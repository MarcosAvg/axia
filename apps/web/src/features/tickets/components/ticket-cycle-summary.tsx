import { HintIcon } from '@/components/shared/hint'
import { formatMinutes, formatPercent } from '@/features/metrics'
import type { TicketDetailWithTimes } from '../domain/types'
import { detailSectionHints } from '../detail-hints'
import { cycleMessages } from '../i18n-cycle'

const t = cycleMessages

type CycleTimes = TicketDetailWithTimes['cycleTimes']

type PrimaryKey =
  | 'response'
  | 'assignment'
  | 'pendingTake'
  | 'wait'
  | 'active'
  | 'pause'
  | 'dormant'
  | 'validation'
  | 'claim'

const PRIMARY: Array<{ key: PrimaryKey; label: string }> = [
  { key: 'response', label: t.phases.response },
  { key: 'assignment', label: t.phases.assignment },
  { key: 'pendingTake', label: t.phases.pendingTake },
  { key: 'wait', label: t.phases.wait },
  { key: 'active', label: t.phases.active },
  { key: 'pause', label: t.phases.pause },
  { key: 'dormant', label: t.phases.dormant },
  { key: 'validation', label: t.phases.validation },
  { key: 'claim', label: t.phases.claim },
]

function percent(minutes: number, total: number): string {
  return total > 0 ? formatPercent(minutes / total) : '0%'
}

function SummaryRow({
  label,
  minutes,
  total,
  hint,
}: {
  label: string
  minutes: number
  total: number
  hint?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex min-w-0 items-center gap-1 text-muted-foreground">
        <span className="truncate">{label}</span>
        {hint ? <HintIcon hint={hint} label={label} /> : null}
      </dt>
      <dd className="shrink-0 tabular-nums">
        {formatMinutes(minutes)}
        <span className="ml-2 text-xs text-muted-foreground">
          {percent(minutes, total)}
        </span>
      </dd>
    </div>
  )
}

/** Resumen informativo del tiempo por fase de un tiquet, sin gráfica. */
export function TicketCycleSummary({ times }: { times: CycleTimes }) {
  const rows = PRIMARY.map((phase) => ({
    ...phase,
    minutes: times[phase.key],
  }))
    .filter((phase) => phase.minutes > 0)
    .sort((left, right) => right.minutes - left.minutes)
  const primarySum = rows.reduce((sum, phase) => sum + phase.minutes, 0)
  const reassignment = times.reassignment
  const residual = Math.max(0, times.total - primarySum)
  const isEmpty = rows.length === 0 && reassignment <= 0 && residual < 1

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="text-xs text-muted-foreground">{t.total}</span>
        <span className="font-medium tabular-nums">
          {formatMinutes(times.total)}
        </span>
      </p>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {rows.map((phase) => (
            <SummaryRow
              key={phase.key}
              label={phase.label}
              minutes={phase.minutes}
              total={times.total}
            />
          ))}
          {reassignment > 0 ? (
            <SummaryRow
              label={t.phases.reassignment}
              minutes={reassignment}
              total={times.total}
              hint={detailSectionHints.cycleReassignment}
            />
          ) : null}
          {residual >= 1 ? (
            <SummaryRow
              label={t.phases.unclassified}
              minutes={residual}
              total={times.total}
              hint={detailSectionHints.cycleUnclassified}
            />
          ) : null}
        </dl>
      )}
    </div>
  )
}
