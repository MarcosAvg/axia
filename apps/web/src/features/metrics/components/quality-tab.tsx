import { formatPercent } from '../domain/metrics'
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
import { DuplicatesSection } from './duplicates-section'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'
import { PausesChart } from './pauses-chart'
import { RejectCancelSection } from './reject-cancel-section'

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
      delta: change((s) => s.recaptureRate),
      lowerIsBetter: true,
    },
    {
      label: k.reopen,
      value: formatPercent(summary.reopenRate),
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

/** Calidad: tasas, pausas por motivo y duplicados. */
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
        cards={qualityCards(summary, comparison)}
        columns={5}
        period={comparison?.label}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={metricsMessages.charts.pauses}>
          <PausesChart data={pauses} />
        </ChartCard>
        <ChartCard title={metricsMessages.duplicates.title}>
          <DuplicatesSection {...duplicates} />
        </ChartCard>
      </div>
      <ChartCard title={metricsMessages.rejectCancel.title}>
        <RejectCancelSection rows={rejectCancel} />
      </ChartCard>
    </div>
  )
}
