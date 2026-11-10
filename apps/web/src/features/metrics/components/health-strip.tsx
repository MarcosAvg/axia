import { cn } from 'cn'
import { HintIcon } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { aggregationHint, aggregationLabel } from '@/lib/time-aggregation'
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
import { deltaOf as deltaOfValue } from '../domain/period'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { modeValue, type TimeMode } from '../domain/time-mode'
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
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{stat.label}</span>
        <HintIcon hint={stat.hint} label={stat.label} />
      </span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
        {stat.value}
      </span>
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

interface StatInput {
  summary: MetricsSummary
  comparison: Comparison | null
  aggregation: ReturnType<typeof useTimeAggregation>['aggregation']
  satisfaction: SatisfactionSummary
  sla: SlaSummary
  mode: TimeMode
}

function activeMinutes(input: StatInput, summary: MetricsSummary) {
  return modeValue(
    summary as unknown as Record<string, number>,
    'active',
    input.mode,
    input.aggregation,
  )
}

function deltaOf(
  input: StatInput,
  pick: (summary: MetricsSummary) => number,
): number | undefined {
  if (!input.comparison) return undefined
  return (
    deltaOfValue(pick(input.summary), pick(input.comparison.summary)) ??
    undefined
  )
}

function ticketStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.tickets,
    value: String(input.summary.tickets),
    hint: metricsMessages.kpiHints.tickets,
    delta: deltaOf(input, (summary) => summary.tickets),
  }
}

function openStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.open,
    value: String(input.summary.open),
    hint: metricsMessages.kpiHints.open,
  }
}

function activeStat(input: StatInput): Stat {
  return {
    label: aggregationLabel(metricsMessages.kpi.activeShort, input.aggregation),
    value: formatMinutes(activeMinutes(input, input.summary)),
    hint: aggregationHint(metricsMessages.kpiHints.active, input.aggregation),
    delta: deltaOf(input, (summary) => activeMinutes(input, summary)),
    lowerIsBetter: true,
  }
}

function slaStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.slaShort,
    value: formatRate(input.sla.complianceRate),
    hint: metricsMessages.kpiHints.sla,
  }
}

function satisfactionStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.satisfaction,
    value: formatScore(input.satisfaction.average),
    hint: metricsMessages.kpiHints.satisfaction,
  }
}

function firstFixStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.firstFixShort,
    value: formatPercent(input.summary.firstTimeFixRate),
    hint: metricsMessages.kpiHints.firstFix,
  }
}

function buildStats(input: StatInput): Stat[] {
  return [
    ticketStat(input),
    openStat(input),
    activeStat(input),
    slaStat(input),
    satisfactionStat(input),
    firstFixStat(input),
  ]
}

/** Franja compacta de salud, dentro de la pestaña Resumen. */
export function HealthStrip({
  summary,
  comparison,
  satisfaction,
  sla,
  mode,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
  satisfaction: SatisfactionSummary
  sla: SlaSummary
  mode: TimeMode
}) {
  const { aggregation } = useTimeAggregation()
  const stats = buildStats({
    summary,
    comparison,
    aggregation,
    satisfaction,
    sla,
    mode,
  })
  return (
    <section
      aria-label={metricsMessages.health}
      className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl bg-card p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-6"
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
