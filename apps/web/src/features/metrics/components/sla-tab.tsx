import type {
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
} from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { SlaPriorityChart } from './sla-priority-chart'

/** SLA y satisfacción: detalle por prioridad y contexto de la calificación. */
export function SlaTab({
  sla,
  slaRows,
  satisfaction,
}: {
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  satisfaction: SatisfactionSummary
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {metricsMessages.sla.summary(
          sla.met,
          sla.withTarget,
          satisfaction.ratings,
        )}
      </p>
      <ChartCard
        title={metricsMessages.sla.title}
        hint={metricsMessages.chartHints.sla}
      >
        <SlaPriorityChart rows={slaRows} />
      </ChartCard>
    </div>
  )
}
