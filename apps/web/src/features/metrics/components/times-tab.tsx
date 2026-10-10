import { HintLabel } from '@/components/shared/hint'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { DimensionSections } from './dimension-sections'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

function timeCards(
  summary: MetricsSummary,
  comparison: Comparison | null,
): Kpi[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (s: MetricsSummary) => number) =>
    comparison ? deltaOf(pick(summary), pick(comparison.summary)) : undefined
  return [
    {
      label: k.active,
      value: formatMinutes(summary.avgActive),
      hint: hints.active,
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
      hint: hints.total,
      delta: change((s) => s.avgTotal),
      lowerIsBetter: true,
    },
    {
      label: k.net,
      value: formatMinutes(summary.avgNet),
      hint: hints.net,
      delta: change((s) => s.avgNet),
      lowerIsBetter: true,
    },
    {
      label: k.response,
      value: formatMinutes(summary.avgResponse),
      hint: hints.response,
      delta: change((s) => s.avgResponse),
      lowerIsBetter: true,
    },
    {
      label: k.assignment,
      value: formatMinutes(summary.avgAssignment),
      hint: hints.assignment,
      delta: change((s) => s.avgAssignment),
      lowerIsBetter: true,
    },
    {
      label: k.validation,
      value: formatMinutes(summary.avgValidation),
      hint: hints.validation,
      delta: change((s) => s.avgValidation),
      lowerIsBetter: true,
    },
  ]
}

/** Tiempos: KPI de duración y desglose por dimensión. */
export function TimesTab({
  summary,
  comparison,
  groups,
  nameOf,
}: {
  summary: MetricsSummary
  comparison: Comparison | null
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
}) {
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid
        cards={timeCards(summary, comparison)}
        columns={4}
        period={comparison?.label}
      />
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          <HintLabel
            label={metricsMessages.charts.timesByDimension}
            hint={metricsMessages.chartHints.timesByDimension}
          />
        </h2>
        <DimensionSections groups={groups} nameOf={nameOf} variant="times" />
      </div>
    </div>
  )
}
