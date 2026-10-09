import { statusLabels } from '@/features/tickets'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type { RoutingSummary } from '../domain/indicators'
import { openAging, volumeByDate } from '../domain/metrics'
import type { MetricsTicket } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionCharts } from './dimension-charts'
import { DimensionTable } from './dimension-table'
import { RoutingCards } from './routing-cards'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

/** Resumen: volumen, todas las dimensiones, ruteo y antigüedad. */
export function SummaryTab({
  filtered,
  groups,
  nameOf,
  routing,
}: {
  filtered: MetricsTicket[]
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  routing: RoutingSummary
}) {
  return (
    <div className="flex flex-col gap-4">
      <ChartCard title={metricsMessages.charts.volume}>
        <VolumeChart data={volumeByDate(filtered)} />
      </ChartCard>
      <DimensionCharts groups={groups} nameOf={nameOf} />
      <ChartCard title={metricsMessages.charts.dimensionDetail}>
        <DimensionTable groups={groups} nameOf={nameOf} />
      </ChartCard>
      <ChartCard title={metricsMessages.routing.title}>
        <RoutingCards routing={routing} />
      </ChartCard>
      <ChartCard title={metricsMessages.aging.title}>
        <AgingList
          rows={openAging(filtered, new Date()).slice(0, 8)}
          statusLabel={statusLabel}
        />
      </ChartCard>
    </div>
  )
}
