import { useState } from 'react'
import {
  useBuildings,
  useCategories,
  useDependencies,
  useTeams,
} from '@/features/catalogs'
import type { Option } from '@/features/catalogs'
import { statusLabels } from '@/features/tickets'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
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
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsFilters as Filters,
  MetricsTicket,
  PauseReasonRow,
  SatisfactionSummary,
} from '../domain/metrics'
import { metricsMessages } from '../i18n'
import {
  useMetricsTickets,
  usePausesByReason,
  useDuplicates,
  useSatisfaction,
} from '../hooks/use-metrics'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionChart } from './dimension-chart'
import { DimensionTable } from './dimension-table'
import { DuplicatesSection } from './duplicates-section'
import { MetricsFilters } from './metrics-filters'
import type { FilterCatalogs } from './metrics-filters'
import { MetricsKpis } from './metrics-kpis'
import { PausesChart } from './pauses-chart'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

function buildCatalogs(
  buildings: Option[] | undefined,
  teams: Option[] | undefined,
  categories: Option[] | undefined,
  dependencies: Option[] | undefined,
): FilterCatalogs {
  return {
    buildings: buildings ?? [],
    teams: teams ?? [],
    categories: categories ?? [],
    dependencies: dependencies ?? [],
  }
}

function buildDuplicates(
  tickets: DuplicateTicket[] | undefined,
  alerts: DuplicateAlert[] | undefined,
  rows: DuplicateDimensionRow[] | undefined,
) {
  return {
    tickets: tickets ?? [],
    alerts: alerts ?? [],
    rows: rows ?? [],
  }
}

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
    return <LoadingList rows={4} />
  }
  if (isError) {
    return <ErrorAlert message={metricsMessages.error} />
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

function MetricsTail({
  filtered,
  duplicates,
}: {
  filtered: MetricsTicket[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
}) {
  return (
    <>
      <ChartCard title={metricsMessages.aging.title}>
        <AgingList
          rows={openAging(filtered, new Date())}
          statusLabel={statusLabel}
        />
      </ChartCard>
      <ChartCard title={metricsMessages.duplicates.title}>
        <DuplicatesSection {...duplicates} />
      </ChartCard>
    </>
  )
}

function MetricsContent({
  filtered,
  dimension,
  nameOf,
  pauses,
  duplicates,
  satisfaction,
  onDimensionChange,
}: {
  filtered: MetricsTicket[]
  dimension: Dimension
  nameOf: (id: string) => string
  pauses: PauseReasonRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
  satisfaction: SatisfactionSummary | undefined
  onDimensionChange: (dimension: Dimension) => void
}) {
  return (
    <>
      <MetricsKpis
        summary={summarize(filtered)}
        satisfaction={satisfaction ?? { average: null, ratings: 0 }}
      />
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
      <MetricsTail filtered={filtered} duplicates={duplicates} />
    </>
  )
}

/** Tablero de indicadores con filtros. */
export function MetricsDashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [dimension, setDimension] = useState<Dimension>('team')
  const tickets = useMetricsTickets()
  const pauses = usePausesByReason()
  const duplicates = useDuplicates()
  const satisfaction = useSatisfaction()
  const buildings = useBuildings()
  const teams = useTeams()
  const categories = useCategories()
  const dependencies = useDependencies()

  const catalogs = buildCatalogs(
    buildings.data,
    teams.data,
    categories.data,
    dependencies.data,
  )
  const duplicatesData = buildDuplicates(
    duplicates.tickets.data,
    duplicates.alerts.data,
    duplicates.byDimension.data,
  )
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
          duplicates={duplicatesData}
          satisfaction={satisfaction.data}
          onDimensionChange={setDimension}
        />
      ) : null}
    </div>
  )
}
