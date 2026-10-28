import { cn } from 'cn'
import { HintIcon } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import {
  aggregationHint,
  aggregationLabel,
  timeValue,
} from '@/lib/time-aggregation'
import {
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
} from '../domain/metrics'
import type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
} from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { DeltaBadge } from './delta-badge'

interface Stat {
  label: string
  value: string
  hint: string
  delta?: number
  lowerIsBetter?: boolean
}

function StatItem({
  stat,
  period,
  first,
}: {
  stat: Stat
  period?: string
  first: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-0.5',
        !first && 'sm:border-l sm:pl-4',
      )}
    >
      <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <span className="truncate">{stat.label}</span>
        <HintIcon hint={stat.hint} label={stat.label} />
      </span>
      <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
      <span className="min-h-4 text-xs">
        {stat.delta !== undefined ? (
          <DeltaBadge
            change={stat.delta}
            lowerIsBetter={stat.lowerIsBetter}
            period={period}
          />
        ) : null}
      </span>
    </div>
  )
}

function buildStats({
  summary,
  comparison,
  aggregation,
  satisfaction,
  sla,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
  aggregation: ReturnType<typeof useTimeAggregation>['aggregation']
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}): Stat[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (value: MetricsSummary) => number) =>
    comparison ? deltaOf(pick(summary), pick(comparison.summary)) : undefined
  const active = (value: MetricsSummary) =>
    timeValue(aggregation, value.avgActive, value.sumActive)
  return [
    {
      label: k.tickets,
      value: String(summary.tickets),
      hint: hints.tickets,
      delta: change((value) => value.tickets) ?? undefined,
    },
    {
      label: k.open,
      value: String(summary.open),
      hint: hints.open,
    },
    {
      label: aggregationLabel(k.activeShort, aggregation),
      value: formatMinutes(active(summary)),
      hint: aggregationHint(hints.active, aggregation),
      delta: change(active) ?? undefined,
      lowerIsBetter: true,
    },
    {
      label: k.slaShort,
      value: formatRate(sla.complianceRate),
      hint: hints.sla,
    },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
    {
      label: k.firstFixShort,
      value: formatPercent(summary.firstTimeFixRate),
      hint: hints.firstFix,
    },
  ]
}

/** Franja compacta de salud, dentro de la pestaña Resumen. */
export function HealthStrip({
  summary,
  comparison,
  satisfaction,
  sla,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}) {
  const { aggregation } = useTimeAggregation()
  const stats = buildStats({
    summary,
    comparison,
    aggregation,
    satisfaction,
    sla,
  })
  return (
    <section
      aria-label={metricsMessages.health}
      className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-3 sm:grid-cols-3 xl:grid-cols-6"
    >
      {stats.map((stat, index) => (
        <StatItem
          key={stat.label}
          stat={stat}
          period={comparison?.label}
          first={index === 0}
        />
      ))}
    </section>
  )
}
