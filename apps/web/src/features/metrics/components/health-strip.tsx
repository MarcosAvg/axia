import { cn } from 'cn'
import { HintIcon } from '@/components/shared/hint'
import { formatPercent, formatRate, formatScore } from '../domain/metrics'
import type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
} from '../domain/metrics'
import type { DimensionGroup } from '../domain/dimensions'
import { healthSnapshot } from '../domain/health'
import type { HealthSnapshot } from '../domain/health'
import { deltaOf as deltaOfValue } from '../domain/period'
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
  startOfRow,
}: {
  stat: Stat
  period?: string
  startOfRow: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-0.5',
        !startOfRow && 'lg:border-l lg:pl-4',
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
  snapshot: HealthSnapshot
  comparison: Comparison | null
}

function deltaOf(
  input: StatInput,
  current: number,
  previous: number | undefined,
): number | undefined {
  if (!input.comparison || previous === undefined) return undefined
  return deltaOfValue(current, previous) ?? undefined
}

function ticketStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.ticketsTotal,
    value: String(input.snapshot.tickets),
    hint: metricsMessages.kpiHints.ticketsTotal,
    delta: deltaOf(
      input,
      input.snapshot.tickets,
      input.comparison?.summary.tickets,
    ),
  }
}

function activeStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.activeTickets,
    value: String(input.snapshot.active),
    hint: metricsMessages.kpiHints.activeTickets,
    delta: deltaOf(
      input,
      input.snapshot.active,
      input.comparison?.summary.open,
    ),
  }
}

function unassignedStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.unassigned,
    value: String(input.snapshot.unassigned),
    hint: metricsMessages.kpiHints.unassigned,
  }
}

function pausedStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.paused,
    value: String(input.snapshot.paused),
    hint: metricsMessages.kpiHints.pausedTickets,
  }
}

function closedStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.closedTickets,
    value: String(input.snapshot.closed),
    hint: metricsMessages.kpiHints.closedTickets,
  }
}

function slaStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.slaCompliance,
    value: formatRate(input.snapshot.sla),
    hint: metricsMessages.kpiHints.slaCompliance,
  }
}

function satisfactionStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.satisfaction,
    value: formatScore(input.snapshot.satisfaction),
    hint: metricsMessages.kpiHints.satisfaction,
  }
}

function firstFixStat(input: StatInput): Stat {
  return {
    label: metricsMessages.kpi.firstFixShort,
    value: formatPercent(input.snapshot.firstFix),
    hint: metricsMessages.kpiHints.firstFix,
  }
}

function buildStats(input: StatInput): Stat[] {
  return [
    ticketStat(input),
    activeStat(input),
    unassignedStat(input),
    pausedStat(input),
    closedStat(input),
    slaStat(input),
    satisfactionStat(input),
    firstFixStat(input),
  ]
}

/** Franja compacta de salud, dentro de la pestaña Resumen. */
export function HealthStrip({
  summary,
  groups,
  comparison,
  satisfaction,
  sla,
}: {
  summary: MetricsSummary
  groups: DimensionGroup[]
  comparison: Comparison | null
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}) {
  const snapshot = healthSnapshot({ summary, groups, sla, satisfaction })
  const stats = buildStats({ snapshot, comparison })
  return (
    <section
      aria-label={metricsMessages.health}
      className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl bg-card p-4 sm:p-5 lg:grid-cols-4"
    >
      {stats.map((stat, index) => (
        <StatItem
          key={stat.label}
          stat={stat}
          period={comparison?.label}
          startOfRow={index % 4 === 0}
        />
      ))}
    </section>
  )
}
