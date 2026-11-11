import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { aggregationLabel, timeValue } from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CycleInput, CyclePhase, CycleSlice } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { modeValue, totalInMode, type TimeMode } from '../domain/time-mode'
import { ChartCard } from './chart-card'

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

const k = metricsMessages.kpi
const t = metricsMessages.times

interface PhaseView extends CycleSlice {
  label: string
}

function phaseLabel(phase: CyclePhase, aggregation: TimeAggregation): string {
  if (phase === 'active') return aggregationLabel(k.active, aggregation)
  return t.phases[phase]
}

function CycleLegend({ slices }: { slices: PhaseView[] }) {
  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
      {slices.map((slice) => (
        <li key={slice.phase} className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: COLORS[slice.phase] }}
            aria-hidden
          />
          <span className="text-muted-foreground">{slice.label}</span>
          <span className="font-medium tabular-nums">
            {formatMinutes(slice.minutes)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CycleFooter({
  summary,
  aggregation,
  mode,
}: {
  summary: MetricsSummary
  aggregation: TimeAggregation
  mode: TimeMode
}) {
  const minutes = (average: number, total: number) =>
    formatMinutes(timeValue(aggregation, average, total))
  const net =
    aggregation === 'total'
      ? totalInMode(summary.sumNet, summary.sumNetLabor, mode)
      : totalInMode(summary.avgNet, summary.avgNetLabor, mode)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
      <span>
        {k.activeExtra}:{' '}
        <span className="font-medium text-foreground">
          {minutes(summary.avgActiveExtra, summary.sumActiveExtra)}
        </span>
      </span>
      <span>
        {k.net}:{' '}
        <span className="font-medium text-foreground">
          {formatMinutes(net)}
        </span>
      </span>
    </div>
  )
}

/** Barra apilada y leyenda de fases, sin controles de agregación. */
function CycleChart({ slices, total }: { slices: PhaseView[]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-10 w-full overflow-hidden rounded-lg bg-muted"
        aria-hidden
      >
        {slices.map((slice) => (
          <span
            key={slice.phase}
            className="h-full"
            style={{
              width: `${shareOf(slice.minutes, total) * 100}%`,
              background: COLORS[slice.phase],
            }}
          />
        ))}
      </div>
      <CycleLegend slices={slices} />
    </div>
  )
}

/** Tiempos reales de las fases de un solo tiquet. */
export function TicketCycleChart({ times }: { times: CycleInput }) {
  const slices = cyclePhases(times).map((slice) => ({
    ...slice,
    label: t.phases[slice.phase],
  }))
  return <CycleChart slices={slices} total={times.total} />
}

/** Composición del ciclo medio en una sola barra apilada. */
export function CycleBar({
  summary,
  mode,
}: {
  summary: MetricsSummary
  mode: TimeMode
}) {
  const { aggregation } = useTimeAggregation()
  const record = summary as unknown as Record<string, number>
  const value = (key: string) => modeValue(record, key, mode, aggregation)
  const total = value('total')
  const slices: PhaseView[] = cyclePhases({
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
  }).map((slice) => ({
    ...slice,
    label: phaseLabel(slice.phase, aggregation),
  }))

  return (
    <ChartCard title={t.cycle}>
      <div className="flex flex-col gap-3">
        <CycleChart slices={slices} total={total} />
        <CycleFooter summary={summary} aggregation={aggregation} mode={mode} />
      </div>
    </ChartCard>
  )
}
