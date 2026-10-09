import { formatMinutes } from '../domain/metrics'
import type { DimensionRow, MetricsSummary } from '../domain/metrics'
import { deltaOf } from '../domain/period'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DimensionTable } from './dimension-table'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

function timeCards(
  summary: MetricsSummary,
  prev: MetricsSummary | null,
): Kpi[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (s: MetricsSummary) => number) =>
    prev ? deltaOf(pick(summary), pick(prev)) : undefined
  return [
    {
      label: k.active,
      value: formatMinutes(summary.avgActive),
      delta: change((s) => s.avgActive),
      lowerIsBetter: true,
    },
    {
      label: k.activeExtra,
      value: formatMinutes(summary.avgActiveExtra),
      hint: hints.activeExtra,
      delta: change((s) => s.avgActiveExtra),
      lowerIsBetter: true,
    },
    {
      label: k.total,
      value: formatMinutes(summary.avgTotal),
      delta: change((s) => s.avgTotal),
      lowerIsBetter: true,
    },
    {
      label: k.net,
      value: formatMinutes(summary.avgNet),
      delta: change((s) => s.avgNet),
      lowerIsBetter: true,
    },
    {
      label: k.response,
      value: formatMinutes(summary.avgResponse),
      delta: change((s) => s.avgResponse),
      lowerIsBetter: true,
    },
    {
      label: k.assignment,
      value: formatMinutes(summary.avgAssignment),
      delta: change((s) => s.avgAssignment),
      lowerIsBetter: true,
    },
    {
      label: k.validation,
      value: formatMinutes(summary.avgValidation),
      delta: change((s) => s.avgValidation),
      lowerIsBetter: true,
    },
  ]
}

/** Tiempos: KPI de duración y tabla por dimensión. */
export function TimesTab({
  summary,
  prev,
  rows,
  nameOf,
}: {
  summary: MetricsSummary
  prev: MetricsSummary | null
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid cards={timeCards(summary, prev)} columns={4} />
      <ChartCard title={metricsMessages.table.dimension}>
        <DimensionTable rows={rows} nameOf={nameOf} />
      </ChartCard>
    </div>
  )
}
