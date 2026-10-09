import { statusLabels } from '@/features/tickets'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type { RoutingSummary } from '../domain/indicators'
import { openAging, volumeByMonth } from '../domain/metrics'
import type { MetricsTicket } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionSections } from './dimension-sections'
import { RoutingCards } from './routing-cards'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

/** Resumen: volumen + ruteo, una sección por dimensión y antigüedad. */
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
            <VolumeChart data={volumeByMonth(filtered)} />
          </ChartCard>
        </div>
        <ChartCard title={metricsMessages.routing.title}>
          <RoutingCards routing={routing} columns={2} />
        </ChartCard>
      </div>
      <DimensionSections
        groups={groups}
        nameOf={nameOf}
        variant="counts"
        withChart
      />
      <ChartCard title={metricsMessages.aging.title}>
        <div className="max-h-80 overflow-auto">
          <AgingList
            rows={openAging(filtered, new Date()).slice(0, 8)}
            statusLabel={statusLabel}
          />
        </div>
      </ChartCard>
    </div>
  )
}
