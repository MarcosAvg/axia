import { AggregationToggle } from '@/components/shared/aggregation-toggle'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { aggregationLabel, timeValue } from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { messages } from '@/lib/i18n'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CyclePhase, CycleSlice } from '../domain/visuals'
import { metricsMessages } from '../i18n'

const COLORS: Record<CyclePhase, string> = {
  response: 'var(--chart-1)',
  assignment: 'var(--chart-2)',
  reassignment: 'var(--chart-3)',
  wait: 'var(--warning)',
  active: 'var(--success)',
  pause: 'var(--destructive)',
  validation: 'var(--chart-4)',
  claim: 'var(--chart-5)',
  unclassified: 'var(--border)',
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
}: {
  summary: MetricsSummary
  aggregation: TimeAggregation
}) {
  const minutes = (average: number, total: number) =>
    formatMinutes(timeValue(aggregation, average, total))
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
          {minutes(summary.avgNet, summary.sumNet)}
        </span>
      </span>
    </div>
  )
}

/** Composición del ciclo medio en una sola barra apilada. */
export function CycleBar({ summary }: { summary: MetricsSummary }) {
  const { aggregation } = useTimeAggregation()
  const minutes = (average: number, total: number) =>
    timeValue(aggregation, average, total)
  const total = minutes(summary.avgTotal, summary.sumTotal)
  const slices: PhaseView[] = cyclePhases({
    response: minutes(summary.avgResponse, summary.sumResponse),
    assignment: minutes(summary.avgAssignment, summary.sumAssignment),
    reassignment: minutes(summary.avgReassignment, summary.sumReassignment),
    wait: minutes(summary.avgWait, summary.sumWait),
    active: minutes(summary.avgActive, summary.sumActive),
    pause: minutes(summary.avgPause, summary.sumPause),
    validation: minutes(summary.avgValidation, summary.sumValidation),
    claim: minutes(summary.avgClaim, summary.sumClaim),
    total,
  }).map((slice) => ({
    ...slice,
    label: phaseLabel(slice.phase, aggregation),
  }))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t.cycle}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {messages.aggregation.label}
          </span>
          <AggregationToggle />
        </div>
      </div>
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
      <CycleFooter summary={summary} aggregation={aggregation} />
    </section>
  )
}
