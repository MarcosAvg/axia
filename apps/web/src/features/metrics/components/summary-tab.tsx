import { statusLabels } from '@/features/tickets'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type { RoutingSummary } from '../domain/indicators'
import type {
  AgingRow,
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
  VolumePoint,
} from '../domain/metrics'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionExplorer } from './dimension-explorer'
import { HealthStrip } from './health-strip'
import { RoutingStats } from './routing-stats'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

function OverviewCharts({
  volume,
  routing,
}: {
  volume: VolumePoint[]
  routing: RoutingSummary
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      <div className="lg:col-span-3">
        <ChartCard
          title={metricsMessages.charts.volume}
          hint={metricsMessages.chartHints.volume}
        >
          <VolumeChart data={volume} />
        </ChartCard>
      </div>
      <div className="lg:col-span-2">
        <ChartCard
          title={metricsMessages.routing.title}
          hint={metricsMessages.chartHints.routing}
        >
          <RoutingStats routing={routing} />
        </ChartCard>
      </div>
    </div>
  )
}

/** Resumen: salud, volumen, ruteo, dimensiones y antigüedad. */
export function SummaryTab({
  volume,
  aging,
  groups,
  nameOf,
  routing,
  summary,
  comparison,
  satisfaction,
  sla,
}: {
  volume: VolumePoint[]
  aging: AgingRow[]
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  routing: RoutingSummary
  summary: MetricsSummary
  comparison: Comparison | null
  satisfaction: SatisfactionSummary
  sla: SlaSummary
}) {
  return (
    <div className="flex flex-col gap-4">
      <HealthStrip
        summary={summary}
        comparison={comparison}
        satisfaction={satisfaction}
        sla={sla}
      />
      <OverviewCharts volume={volume} routing={routing} />
      <DimensionExplorer groups={groups} nameOf={nameOf} variant="counts" />
      <ChartCard
        title={metricsMessages.aging.title}
        hint={metricsMessages.chartHints.aging}
      >
        <div className="max-h-80 overflow-auto">
          <AgingList rows={aging} statusLabel={statusLabel} />
        </div>
      </ChartCard>
    </div>
  )
}
