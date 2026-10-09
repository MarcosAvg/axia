import {
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
} from '../domain/metrics'
import { deltaOf } from '../domain/period'
import type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
} from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

/** Indicadores clave del tablero, siempre visibles. */
export function MetricsHero({
  summary,
  prev,
  satisfaction,
  sla,
}: {
  summary: MetricsSummary
  prev: MetricsSummary | null
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}) {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const change = (pick: (summary: MetricsSummary) => number) =>
    prev ? deltaOf(pick(summary), pick(prev)) : undefined
  const cards: Kpi[] = [
    {
      label: k.tickets,
      value: String(summary.tickets),
      delta: change((s) => s.tickets),
    },
    {
      label: k.active,
      value: formatMinutes(summary.avgActive),
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
  return <KpiGrid cards={cards} columns={5} />
}
