import { averageOf, formatMinutes, formatPercent } from '../domain/metrics'
import type { RejectCancelRow } from '../domain/indicators'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsSummary,
  PauseReasonRow,
} from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DuplicateRateChart } from './duplicate-rate-chart'
import { DuplicateSections } from './duplicate-sections'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'
import { PausesChart } from './pauses-chart'
import { RejectCancelChart } from './reject-cancel-chart'

function qualityCards(
  summary: MetricsSummary,
  comparison: Comparison | null,
): Kpi[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (s: MetricsSummary) => number) =>
    comparison ? deltaOf(pick(summary), pick(comparison.summary)) : undefined
  return [
    {
      label: k.reassignment,
      value: formatPercent(summary.reassignmentRate),
      hint: hints.reassignment,
      delta: change((s) => s.reassignmentRate),
      lowerIsBetter: true,
    },
    {
      label: k.reassignedTechnician,
      value: formatPercent(summary.technicianReassignmentRate),
      hint: hints.reassignedTechnician,
      delta: change((s) => s.technicianReassignmentRate),
      lowerIsBetter: true,
    },
    {
      label: k.recapture,
      value: formatPercent(summary.recaptureRate),
      hint: hints.recapture,
      delta: change((s) => s.recaptureRate),
      lowerIsBetter: true,
    },
    {
      label: k.reopen,
      value: formatPercent(summary.reopenRate),
      hint: hints.reopen,
      delta: change((s) => s.reopenRate),
      lowerIsBetter: true,
    },
    {
      label: k.firstFix,
      value: formatPercent(summary.firstTimeFixRate),
      hint: hints.firstFix,
      delta: change((s) => s.firstTimeFixRate),
      lowerIsBetter: false,
    },
  ]
}

function duplicateCards(duplicates: {
  tickets: DuplicateTicket[]
  alerts: DuplicateAlert[]
}): Kpi[] {
  const t = metricsMessages.duplicates
  const hints = metricsMessages.duplicateHints
  const decisions = t.decisions as Record<string, string>
  const avg = averageOf(
    duplicates.tickets.map((item) => item.timeToMarkMinutes),
  )
  return [
    { label: t.timeToMark, value: formatMinutes(avg), hint: hints.timeToMark },
    ...duplicates.alerts.map((alert) => ({
      label: decisions[alert.decision] ?? alert.decision,
      value: String(alert.candidates),
      hint: hints.alerts,
    })),
  ]
}

/** Calidad: tasas, motivos y duplicados (con sus gráficas). */
export function QualityTab({
  summary,
  comparison,
  pauses,
  duplicates,
  rejectCancel,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
  pauses: PauseReasonRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
  rejectCancel: RejectCancelRow[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid
        cards={[
          ...qualityCards(summary, comparison),
          ...duplicateCards(duplicates),
        ]}
        columns={6}
        period={comparison?.label}
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <ChartCard
          title={metricsMessages.charts.pauses}
          hint={metricsMessages.chartHints.pauses}
        >
          <PausesChart data={pauses} />
        </ChartCard>
        <ChartCard
          title={metricsMessages.rejectCancel.title}
          hint={metricsMessages.chartHints.rejectCancel}
        >
          <RejectCancelChart rows={rejectCancel} />
        </ChartCard>
      </div>
      <div className="flex flex-col gap-3">
        <ChartCard
          title={metricsMessages.duplicates.byDimension}
          hint={metricsMessages.chartHints.duplicatesByDimension}
        >
          <DuplicateRateChart rows={duplicates.rows} />
        </ChartCard>
        <DuplicateSections rows={duplicates.rows} />
      </div>
    </div>
  )
}
