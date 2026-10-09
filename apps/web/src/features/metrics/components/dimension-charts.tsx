import { DIMENSIONS } from '../domain/dimensions'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { dimensionLabels, metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DimensionChart } from './dimension-chart'

/** Una gráfica por dimensión (equipo, edificio, categoría, dependencia, solicitante). */
export function DimensionCharts({
  groups,
  nameOf,
}: {
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {DIMENSIONS.map((dimension) => {
        const rows = groups
          .filter((group) => group.dimension === dimension)
          .map((group) => group.row)
        return (
          <ChartCard
            key={dimension}
            title={`${dimensionLabels[dimension]} · ${metricsMessages.charts.ticketsBy}`}
          >
            <DimensionChart
              id={`metrics-dimension-${dimension}`}
              rows={rows}
              nameOf={(id) => nameOf(dimension, id)}
            />
          </ChartCard>
        )
      })}
    </div>
  )
}
