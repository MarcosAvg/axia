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
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (summary: MetricsSummary) => number) =>
    comparison ? deltaOf(pick(summary), pick(comparison.summary)) : undefined
  const cards: Kpi[] = [
    {
      label: k.tickets,
      value: String(summary.tickets),
      hint: hints.tickets,
      delta: change((s) => s.tickets),
    },
    {
      label: k.active,
      value: formatMinutes(summary.avgActive),
      hint: hints.active,
      delta: change((s) => s.avgActive),
      lowerIsBetter: true,
    },
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
    {
      label: k.firstFix,
      value: formatPercent(summary.firstTimeFixRate),
      hint: hints.firstFix,
      delta: change((s) => s.firstTimeFixRate),
      lowerIsBetter: false,
    },
  ]
  return <KpiGrid cards={cards} columns={5} period={comparison?.label} />
}
