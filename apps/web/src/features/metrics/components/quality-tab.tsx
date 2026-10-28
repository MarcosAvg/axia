import { HintIcon } from '@/components/shared/hint'
import { Progress } from '@/components/ui/progress'
import type { RejectCancelRow, PauseSubstateRow } from '../domain/indicators'
import { averageOf, formatMinutes, formatPercent } from '../domain/metrics'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsSummary,
  PauseReasonRow,
} from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type { Comparison } from '../domain/period'
import type { DimensionGroup } from '../domain/dimensions'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DeltaBadge } from './delta-badge'
import { DuplicateTable } from './duplicate-table'
import { PausesChart } from './pauses-chart'
import { PauseSubstates } from './pause-substates'
import { QualityHeatmap } from './quality-heatmap'
import { RejectCancelTable } from './reject-cancel-chart'
import { RiskScatter } from './risk-scatter'

interface RateStat {
  label: string
  hint: string
  value: string
  percent: number
  delta?: number
  lowerIsBetter: boolean
}

const RATE_DEFINITIONS = [
  {
    label: metricsMessages.kpi.reassignment,
    hint: metricsMessages.kpiHints.reassignment,
    lowerIsBetter: true,
    pick: (value: MetricsSummary) => value.reassignmentRate,
  },
  {
    label: metricsMessages.kpi.reassignedTechnician,
    hint: metricsMessages.kpiHints.reassignedTechnician,
    lowerIsBetter: true,
    pick: (value: MetricsSummary) => value.technicianReassignmentRate,
  },
  {
    label: metricsMessages.kpi.recapture,
    hint: metricsMessages.kpiHints.recapture,
    lowerIsBetter: true,
    pick: (value: MetricsSummary) => value.recaptureRate,
  },
  {
    label: metricsMessages.kpi.reopen,
    hint: metricsMessages.kpiHints.reopen,
    lowerIsBetter: true,
    pick: (value: MetricsSummary) => value.reopenRate,
  },
  {
    label: metricsMessages.kpi.firstFix,
    hint: metricsMessages.kpiHints.firstFix,
    lowerIsBetter: false,
    pick: (value: MetricsSummary) => value.firstTimeFixRate,
  },
]

function rateStats(
  summary: MetricsSummary,
  comparison: Comparison | null,
): RateStat[] {
  return RATE_DEFINITIONS.map((definition) => {
    const ratio = definition.pick(summary)
    return {
      label: definition.label,
      hint: definition.hint,
      value: formatPercent(ratio),
      percent: Math.min(100, Math.max(0, Math.round(ratio * 100))),
      delta: comparison
        ? (deltaOf(ratio, definition.pick(comparison.summary)) ?? undefined)
        : undefined,
      lowerIsBetter: definition.lowerIsBetter,
    }
  })
}

function QualityRates({
  summary,
  comparison,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
}) {
  return (
    <section
      aria-label={metricsMessages.kpiGroups.calidad}
      className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      {rateStats(summary, comparison).map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="flex min-h-7 items-start gap-1 text-[11px] leading-tight font-medium tracking-wide text-muted-foreground uppercase">
            <span>{stat.label}</span>
            <HintIcon hint={stat.hint} label={stat.label} />
          </span>
          <span className="text-xl font-semibold tabular-nums">
            {stat.value}
          </span>
          <Progress
            value={stat.percent}
            className="h-1.5"
            aria-label={`${stat.label}: ${stat.value}`}
          />
          <span className="min-h-4 text-xs">
            {stat.delta !== undefined ? (
              <DeltaBadge
                change={stat.delta}
                lowerIsBetter={stat.lowerIsBetter}
                period={comparison?.label}
              />
            ) : null}
          </span>
        </div>
      ))}
    </section>
  )
}

function DuplicateStats({
  duplicates,
}: {
  duplicates: { tickets: DuplicateTicket[]; alerts: DuplicateAlert[] }
}) {
  const t = metricsMessages.duplicates
  const decisions = t.decisions as Record<string, string>
  const average = averageOf(
    duplicates.tickets.map((item) => item.timeToMarkMinutes),
  )
  return (
    <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
      <div className="flex items-baseline gap-2">
        <dt className="text-muted-foreground">{t.timeToMark}</dt>
        <dd className="font-semibold tabular-nums">{formatMinutes(average)}</dd>
      </div>
      {duplicates.alerts.map((alert) => (
        <div key={alert.decision} className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">
            {decisions[alert.decision] ?? alert.decision}
          </dt>
          <dd className="font-semibold tabular-nums">{alert.candidates}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Calidad: tasas, mapa por dimensión, riesgo, pausas y descartes. */
export function QualityTab({
  summary,
  comparison,
  groups,
  pauses,
  pauseSubstates,
  duplicates,
  rejectCancel,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
  groups: DimensionGroup[]
  pauses: PauseReasonRow[]
  pauseSubstates: PauseSubstateRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
  rejectCancel: RejectCancelRow[]
}) {
  return (
    <div className="flex flex-col gap-5">
      <QualityRates summary={summary} comparison={comparison} />
      <QualityHeatmap groups={groups} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <RiskScatter groups={groups} />
        <ChartCard
          title={metricsMessages.charts.pauses}
          hint={metricsMessages.chartHints.pauses}
        >
          <div className="flex flex-col gap-4">
            <PausesChart data={pauses} />
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Subestados
              </h3>
              <PauseSubstates rows={pauseSubstates} />
            </div>
          </div>
        </ChartCard>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {metricsMessages.duplicates.title}
        </h2>
        <DuplicateStats duplicates={duplicates} />
        <DuplicateTable rows={duplicates.rows} />
      </section>
      <ChartCard
        title={metricsMessages.rejectCancel.title}
        hint={metricsMessages.chartHints.rejectCancel}
      >
        <RejectCancelTable rows={rejectCancel} />
      </ChartCard>
    </div>
  )
}
