import { useState } from 'react'
import {
  useBuildings,
  useCategories,
  useDependencies,
  useTeams,
} from '@/features/catalogs'
import { statusLabels } from '@/features/tickets'
import {
  EMPTY_FILTERS,
  byDimension,
  filterTickets,
  openAging,
  summarize,
  volumeByDate,
} from '../domain/metrics'
import type {
  Dimension,
  MetricsFilters as Filters,
  MetricsTicket,
  PauseReasonRow,
} from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { useMetricsTickets, usePausesByReason } from '../hooks/use-metrics'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionChart } from './dimension-chart'
import { DimensionTable } from './dimension-table'
import { MetricsFilters } from './metrics-filters'
import type { FilterCatalogs } from './metrics-filters'
import { MetricsKpis } from './metrics-kpis'
import { PausesChart } from './pauses-chart'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

function MetricsStatus({
  isLoading,
  isError,
  isEmpty,
}: {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.loading}</p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {metricsMessages.error}
      </p>
    )
  }
  if (isEmpty) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  return null
}

function nameResolver(dimension: Dimension, catalogs: FilterCatalogs) {
  const maps: Record<Dimension, Map<string, string>> = {
    team: new Map(catalogs.teams.map((item) => [item.id, item.name])),
    building: new Map(catalogs.buildings.map((item) => [item.id, item.name])),
    category: new Map(catalogs.categories.map((item) => [item.id, item.name])),
    dependency: new Map(
      catalogs.dependencies.map((item) => [item.id, item.name]),
    ),
  }
  return (id: string) => maps[dimension].get(id) ?? id
}

function MetricsContent({
  filtered,
  dimension,
  nameOf,
  pauses,
  onDimensionChange,
}: {
  filtered: MetricsTicket[]
  dimension: Dimension
  nameOf: (id: string) => string
  pauses: PauseReasonRow[]
  onDimensionChange: (dimension: Dimension) => void
}) {
  return (
    <>
      <MetricsKpis summary={summarize(filtered)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={metricsMessages.charts.volume}>
          <VolumeChart data={volumeByDate(filtered)} />
        </ChartCard>
        <ChartCard title={metricsMessages.charts.byDimension}>
          <DimensionChart
            rows={byDimension(filtered, dimension)}
            nameOf={nameOf}
          />
        </ChartCard>
        <ChartCard title={metricsMessages.charts.pauses}>
          <PausesChart data={pauses} />
        </ChartCard>
      </div>
      <ChartCard title={metricsMessages.table.dimension}>
        <DimensionTable
          dimension={dimension}
          rows={byDimension(filtered, dimension)}
          nameOf={nameOf}
          onDimensionChange={onDimensionChange}
        />
      </ChartCard>
      <ChartCard title={metricsMessages.aging.title}>
        <AgingList
          rows={openAging(filtered, new Date())}
          statusLabel={statusLabel}
        />
      </ChartCard>
    </>
  )
}

/** Tablero de indicadores con filtros. */
export function MetricsDashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [dimension, setDimension] = useState<Dimension>('team')
  const tickets = useMetricsTickets()
  const pauses = usePausesByReason()
  const buildings = useBuildings()
  const teams = useTeams()
  const categories = useCategories()
  const dependencies = useDependencies()

  const catalogs: FilterCatalogs = {
    buildings: buildings.data ?? [],
    teams: teams.data ?? [],
    categories: categories.data ?? [],
    dependencies: dependencies.data ?? [],
  }
  const filtered = filterTickets(tickets.data ?? [], filters)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">{metricsMessages.title}</h1>
        <p className="text-sm text-muted-foreground">
          {metricsMessages.subtitle}
        </p>
      </header>
      <MetricsFilters
        filters={filters}
        catalogs={catalogs}
        onChange={setFilters}
      />
      <MetricsStatus
        isLoading={tickets.isLoading}
        isError={tickets.isError}
        isEmpty={filtered.length === 0}
      />
      {filtered.length > 0 ? (
        <MetricsContent
          filtered={filtered}
          dimension={dimension}
          nameOf={nameResolver(dimension, catalogs)}
          pauses={pauses.data ?? []}
          onDimensionChange={setDimension}
        />
      ) : null}
    </div>
  )
}
