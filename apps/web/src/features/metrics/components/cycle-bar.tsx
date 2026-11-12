import { useTimeMeasure } from '@/components/shared/time-measure-context'
import { isRobustMeasure, type TimeMeasure } from '@/lib/time-measure'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CycleInput, CyclePhase, CycleSlice } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { measureValue, totalInMode, type TimeMode } from '../domain/time-mode'
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

function phaseLabel(phase: CyclePhase, measure: TimeMeasure): string {
  if (phase === 'active' && measure !== 'average') {
    return `${k.active} (${metricsMessages.measure.tags[measure]})`
  }
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
  measure,
  mode,
}: {
  summary: MetricsSummary
  measure: TimeMeasure
  mode: TimeMode
}) {
  const minutes = (average: number, total: number) =>
    formatMinutes(measure === 'total' ? total : average)
  const net =
    measure === 'total'
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
  const { measure } = useTimeMeasure()
  if (isRobustMeasure(measure)) return null
  const record = summary as unknown as Record<string, number>
  const value = (key: string) => measureValue(record, key, mode, measure)
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
    label: phaseLabel(slice.phase, measure),
  }))

  return (
    <ChartCard title={t.cycle} hint={metricsMessages.chartHints.cycle}>
      <div className="flex flex-col gap-3">
        <CycleChart slices={slices} total={total} />
        <CycleFooter summary={summary} measure={measure} mode={mode} />
      </div>
    </ChartCard>
  )
}
