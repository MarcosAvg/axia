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
import { metricsMessages } from '../i18n'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

/** Indicadores clave del tablero, siempre visibles. */
export function MetricsHero({
  summary,
  satisfaction,
  sla,
}: {
  summary: MetricsSummary
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}) {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const cards: Kpi[] = [
    { label: k.tickets, value: String(summary.tickets) },
    { label: k.active, value: formatMinutes(summary.avgActive) },
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
    },
  ]
  return <KpiGrid cards={cards} columns={5} />
}
