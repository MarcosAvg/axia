import type {
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
} from '../domain/metrics'
import { formatMinutes, formatRate, formatScore } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'
import { SlaPriorityChart } from './sla-priority-chart'

const t = metricsMessages.sla
const k = metricsMessages.kpi
const hints = metricsMessages.kpiHints

function minutes(value: number | null): string {
  return value === null ? '—' : formatMinutes(value)
}

/** SLA y satisfacción: cumplimiento, tiempos y detalle por prioridad. */
export function SlaTab({
  sla,
  slaRows,
  satisfaction,
}: {
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  satisfaction: SatisfactionSummary
}) {
  const cards: Kpi[] = [
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
    {
      label: t.met,
      value: `${sla.met} / ${sla.withTarget}`,
      hint: t.metHint,
    },
    {
      label: t.target,
      value: minutes(sla.avgTargetMinutes),
      hint: t.targetHint,
    },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid cards={cards} columns={4} />
      <p className="text-sm text-muted-foreground">
        {t.summary(sla.met, sla.withTarget, satisfaction.ratings)}
      </p>
      <ChartCard title={t.title} hint={metricsMessages.chartHints.sla}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {t.resolution}: {minutes(sla.avgResolutionMinutes)}
          </p>
          <SlaPriorityChart rows={slaRows} />
        </div>
      </ChartCard>
    </div>
  )
}
