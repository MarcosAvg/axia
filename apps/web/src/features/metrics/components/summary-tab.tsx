import { statusLabels } from '@/features/tickets'
import type { RoutingSummary } from '../domain/indicators'
import { openAging, volumeByDate } from '../domain/metrics'
import type { DimensionRow, MetricsTicket } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionChart } from './dimension-chart'
import { RoutingCards } from './routing-cards'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

/** Resumen: volumen, comparación por dimensión, ruteo y antigüedad. */
export function SummaryTab({
  filtered,
  rows,
  nameOf,
  routing,
}: {
  filtered: MetricsTicket[]
  rows: DimensionRow[]
  nameOf: (id: string) => string
  routing: RoutingSummary
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={metricsMessages.charts.volume}>
          <VolumeChart data={volumeByDate(filtered)} />
        </ChartCard>
        <ChartCard title={metricsMessages.charts.byDimension}>
          <DimensionChart rows={rows} nameOf={nameOf} />
        </ChartCard>
      </div>
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
