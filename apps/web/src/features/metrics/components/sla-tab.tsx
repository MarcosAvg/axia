import { formatRate, formatScore } from '../domain/metrics'
import type {
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
} from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'
import { SlaPriorityChart } from './sla-priority-chart'

/** SLA y satisfacción: cumplimiento, detalle por prioridad y calificación. */
export function SlaTab({
  sla,
  slaRows,
  satisfaction,
}: {
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  satisfaction: SatisfactionSummary
}) {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const cards: Kpi[] = [
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid cards={cards} columns={4} />
      <ChartCard
        title={metricsMessages.sla.title}
        hint={metricsMessages.chartHints.sla}
      >
        <SlaPriorityChart rows={slaRows} />
      </ChartCard>
    </div>
  )
}
