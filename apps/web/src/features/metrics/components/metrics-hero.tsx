import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import {
  aggregationHint,
  aggregationLabel,
  timeValue,
} from '@/lib/time-aggregation'
import { formatMinutes, formatRate, formatScore } from '../domain/metrics'
import type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
} from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

/** Indicadores clave del tablero, siempre visibles. */
export function MetricsHero({
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
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (summary: MetricsSummary) => number) =>
    comparison ? deltaOf(pick(summary), pick(comparison.summary)) : undefined
  const active = (s: MetricsSummary) =>
    timeValue(aggregation, s.avgActive, s.sumActive)
  const cards: Kpi[] = [
    {
      label: k.tickets,
      value: String(summary.tickets),
      hint: hints.tickets,
      delta: change((s) => s.tickets),
    },
    {
      label: aggregationLabel(k.active, aggregation),
      value: formatMinutes(active(summary)),
      hint: aggregationHint(hints.active, aggregation),
      delta: change(active),
      lowerIsBetter: true,
    },
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {metricsMessages.health}
      </h2>
      <KpiGrid cards={cards} columns={4} period={comparison?.label} />
    </section>
  )
}
