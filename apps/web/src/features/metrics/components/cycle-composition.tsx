import type { TimeMeasure } from '@/lib/time-measure'
import { formatMinutes, formatPercent } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CyclePhase, CycleSlice } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { measureValue, type TimeMode } from '../domain/time-mode'

const t = metricsMessages.times

const COLORS: Record<CyclePhase, string> = {
  response: 'var(--chart-1)',
  assignment: 'var(--chart-2)',
  pending_take: 'var(--chart-3)',
  wait: 'var(--warning)',
  active: 'var(--success)',
  pause: 'var(--destructive)',
  dormant: 'var(--muted-foreground)',
  validation: 'var(--chart-4)',
  claim: 'var(--chart-5)',
}

function segmentLabel(phase: CyclePhase, minutes: number, total: number) {
  return `${t.phases[phase]}: ${formatMinutes(minutes)} (${formatPercent(
    shareOf(minutes, total),
  )})`
}

function CompositionBar({
  slices,
  total,
  residual,
  label,
}: {
  slices: CycleSlice[]
  total: number
  residual: number
  label: string
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-9 w-full overflow-hidden rounded-lg bg-muted"
    >
      {slices.map((slice) => (
        <span
          key={slice.phase}
          title={segmentLabel(slice.phase, slice.minutes, total)}
          style={{
            width: `${shareOf(slice.minutes, total) * 100}%`,
            background: COLORS[slice.phase],
          }}
        />
      ))}
      {residual > 0 ? (
        <span
          className="h-full bg-muted-foreground/30"
          title={`${t.unclassified}: ${formatMinutes(residual)} (${formatPercent(
            shareOf(residual, total),
          )})`}
          style={{ width: `${shareOf(residual, total) * 100}%` }}
        />
      ) : null}
    </div>
  )
}

/** Barra de composición del ciclo; la tabla de fases es la leyenda. */
export function CycleComposition({
  summary,
  measure,
  mode,
}: {
  summary: MetricsSummary
  measure: TimeMeasure
  mode: TimeMode
}) {
  const record = summary as unknown as Record<string, number>
  const value = (key: string) => measureValue(record, key, mode, measure)
  const total = value('total')
  const slices = cyclePhases({
    response: value('response'),
    assignment: value('assignment'),
    pendingTake: value('pendingTake'),
    wait: value('wait'),
    active: value('active'),
    pause: value('pause'),
    dormant: value('dormant'),
    validation: value('validation'),
    claim: value('claim'),
    total,
  }).filter((slice) => slice.minutes > 0)
  const sum = slices.reduce((acc, slice) => acc + slice.minutes, 0)
  const residual = measure === 'total' ? Math.max(0, total - sum) : 0
  const barTotal = sum > 0 ? sum : total
  const label = slices
    .map((slice) => segmentLabel(slice.phase, slice.minutes, barTotal))
    .join(', ')

  return (
    <div className="flex flex-col gap-2">
      <CompositionBar
        slices={slices}
        total={barTotal}
        residual={residual}
        label={label}
      />
      {residual > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t.unclassified}: {formatMinutes(residual)} ·{' '}
          {formatPercent(shareOf(residual, barTotal))}
        </p>
      ) : null}
    </div>
  )
}
