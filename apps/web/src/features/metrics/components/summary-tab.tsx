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

/** Resumen compacto: volumen + ruteo, dimensiones y detalle con desplazamiento. */
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
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <ChartCard title={metricsMessages.charts.volume}>
            <VolumeChart data={volumeByDate(filtered)} />
          </ChartCard>
        </div>
        <ChartCard title={metricsMessages.routing.title}>
          <RoutingCards routing={routing} columns={2} />
        </ChartCard>
      </div>
      <DimensionCharts groups={groups} nameOf={nameOf} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={metricsMessages.charts.dimensionDetail}>
          <div className="max-h-80 overflow-auto">
            <DimensionTable groups={groups} nameOf={nameOf} />
          </div>
        </ChartCard>
        <ChartCard title={metricsMessages.aging.title}>
          <div className="max-h-80 overflow-auto">
            <AgingList
              rows={openAging(filtered, new Date()).slice(0, 8)}
              statusLabel={statusLabel}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
