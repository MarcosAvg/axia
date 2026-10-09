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

interface Kpi {
  label: string
  value: string
  hint?: string
}

interface KpiGroup {
  title: string
  cards: Kpi[]
}

function KpiGroupBlock({ title, cards }: KpiGroup) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
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
    </section>
  )
}

function timeCards(summary: MetricsSummary): Kpi[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  return [
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
  ]
}

function buildGroups(
  summary: MetricsSummary,
  satisfaction: SatisfactionSummary,
  sla: SlaSummary,
): KpiGroup[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const g = metricsMessages.kpiGroups
  return [
    {
      title: g.carga,
      cards: [{ label: k.tickets, value: String(summary.tickets) }],
    },
    { title: g.tiempos, cards: timeCards(summary) },
    {
      title: g.calidad,
      cards: [
        {
          label: k.reassignment,
          value: formatPercent(summary.reassignmentRate),
        },
        { label: k.recapture, value: formatPercent(summary.recaptureRate) },
        { label: k.reopen, value: formatPercent(summary.reopenRate) },
        {
          label: k.firstFix,
          value: formatPercent(summary.firstTimeFixRate),
          hint: hints.firstFix,
        },
      ],
    },
    {
      title: g.sla,
      cards: [
        {
          label: k.sla,
          value: formatRate(sla.complianceRate),
          hint: hints.sla,
        },
        {
          label: k.satisfaction,
          value: formatScore(satisfaction.average),
          hint: hints.satisfaction,
        },
      ],
    },
  ]
}

/** Tarjetas de indicadores del tablero, agrupadas por área. */
export function MetricsKpis({
  summary,
  satisfaction,
  sla,
}: {
  summary: MetricsSummary
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}) {
  return (
    <div className="flex flex-col gap-6">
      {buildGroups(summary, satisfaction, sla).map((group) => (
        <KpiGroupBlock
          key={group.title}
          title={group.title}
          cards={group.cards}
        />
      ))}
    </div>
  )
}
