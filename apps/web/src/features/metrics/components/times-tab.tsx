import { HintLabel } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import {
  aggregationHint,
  aggregationLabel,
  timeValue,
} from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { DimensionSections } from './dimension-sections'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

const k = metricsMessages.kpi
const hints = metricsMessages.kpiHints

interface TimeMetric {
  label: string
  hint: string
  avg: (s: MetricsSummary) => number
  sum: (s: MetricsSummary) => number
}

const TIME_METRICS: TimeMetric[] = [
  {
    label: k.active,
    hint: hints.active,
    avg: (s) => s.avgActive,
    sum: (s) => s.sumActive,
  },
  {
    label: k.activeExtra,
    hint: hints.activeExtra,
    avg: (s) => s.avgActiveExtra,
    sum: (s) => s.sumActiveExtra,
  },
  {
    label: k.total,
    hint: hints.total,
    avg: (s) => s.avgTotal,
    sum: (s) => s.sumTotal,
  },
  { label: k.net, hint: hints.net, avg: (s) => s.avgNet, sum: (s) => s.sumNet },
  {
    label: k.response,
    hint: hints.response,
    avg: (s) => s.avgResponse,
    sum: (s) => s.sumResponse,
  },
  {
    label: k.assignment,
    hint: hints.assignment,
    avg: (s) => s.avgAssignment,
    sum: (s) => s.sumAssignment,
  },
  {
    label: k.validation,
    hint: hints.validation,
    avg: (s) => s.avgValidation,
    sum: (s) => s.sumValidation,
  },
]

function timeCards(
  summary: MetricsSummary,
  comparison: Comparison | null,
  aggregation: TimeAggregation,
): Kpi[] {
  const change = (pick: (s: MetricsSummary) => number) =>
    comparison ? deltaOf(pick(summary), pick(comparison.summary)) : undefined
  return TIME_METRICS.map((metric) => {
    const value = (s: MetricsSummary) =>
      timeValue(aggregation, metric.avg(s), metric.sum(s))
    return {
      label: aggregationLabel(metric.label, aggregation),
      value: formatMinutes(value(summary)),
      hint: aggregationHint(metric.hint, aggregation),
      delta: change(value),
      lowerIsBetter: true,
    }
  })
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
  const { aggregation } = useTimeAggregation()
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid
        cards={timeCards(summary, comparison, aggregation)}
        columns={4}
        period={comparison?.label}
      />
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          <HintLabel
            label={metricsMessages.charts.timesByDimension}
            hint={aggregationHint(
              metricsMessages.chartHints.timesByDimension,
              aggregation,
            )}
          />
        </h2>
        <DimensionSections groups={groups} nameOf={nameOf} variant="times" />
      </div>
    </div>
  )
}
