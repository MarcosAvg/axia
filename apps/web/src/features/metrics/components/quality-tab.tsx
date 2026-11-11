import { HintIcon } from '@/components/shared/hint'
import { Progress } from '@/components/ui/progress'
import type { PauseSubstateRow, RejectCancelRow } from '../domain/indicators'
import { formatPercent } from '../domain/metrics'
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
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DeltaBadge } from './delta-badge'
import { QualityDiagnosis } from './quality-diagnosis'
import { QualityReasons } from './quality-reasons'

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
      className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {rateStats(summary, comparison).map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="flex min-h-7 items-start gap-1 text-xs leading-tight font-medium text-muted-foreground">
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

function TimeQualityCard({ summary }: { summary: MetricsSummary }) {
  return (
    <ChartCard
      title={metricsMessages.quality.timeQuality}
      hint={metricsMessages.quality.timeQualityHint}
    >
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">
            {metricsMessages.quality.unverifiedTickets}
          </dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {summary.unverifiedTickets}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">
            {metricsMessages.quality.openTimeAlerts}
          </dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {summary.openTimeAlerts}
          </dd>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <dt className="font-medium text-foreground">
            {metricsMessages.quality.timeQualityActionTitle}
          </dt>
          <dd>{metricsMessages.quality.timeQualityAction}</dd>
        </div>
      </dl>
    </ChartCard>
  )
}

/** Calidad: salud, diagnóstico por dimensión y motivos de salida. */
export function QualityTab({
  summary,
  comparison,
  groups,
  pauses,
  pauseSubstates,
  duplicates,
  rejectCancel,
  mode,
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
  mode: TimeMode
}) {
  const t = metricsMessages.quality
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">{t.health}</h2>
        <QualityRates summary={summary} comparison={comparison} />
        <TimeQualityCard summary={summary} />
      </section>
      <QualityDiagnosis groups={groups} mode={mode} />
      <QualityReasons
        summary={summary}
        pauses={pauses}
        pauseSubstates={pauseSubstates}
        duplicates={duplicates}
        rejectCancel={rejectCancel}
      />
    </div>
  )
}
