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
import { MetricCard } from './metric-card'

/** Tarjetas de KPI del tablero. */
export function MetricsKpis({
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
  const cards = [
    { label: k.tickets, value: String(summary.tickets) },
    { label: k.active, value: formatMinutes(summary.avgActive) },
    {
      label: k.activeExtra,
      value: formatMinutes(summary.avgActiveExtra),
      hint: hints.activeExtra,
    },
    { label: k.total, value: formatMinutes(summary.avgTotal) },
    { label: k.net, value: formatMinutes(summary.avgNet) },
    { label: k.response, value: formatMinutes(summary.avgResponse) },
    { label: k.assignment, value: formatMinutes(summary.avgAssignment) },
    { label: k.validation, value: formatMinutes(summary.avgValidation) },
    { label: k.reassignment, value: formatPercent(summary.reassignmentRate) },
    { label: k.recapture, value: formatPercent(summary.recaptureRate) },
    { label: k.reopen, value: formatPercent(summary.reopenRate) },
    {
      label: k.firstFix,
      value: formatPercent(summary.firstTimeFixRate),
      hint: hints.firstFix,
    },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <MetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
        />
      ))}
    </div>
  )
}
