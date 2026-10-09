import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { PageHeader } from '@/components/shared/page-header'
import {
  useBuildings,
  useCategories,
  useDependencies,
  useTeams,
} from '@/features/catalogs'
import type { Option } from '@/features/catalogs'
import {
  EMPTY_FILTERS,
  byDimension,
  filterTickets,
  summarize,
} from '../domain/metrics'
import type {
  Dimension,
  MetricsFilters,
  SatisfactionSummary,
  SlaSummary,
} from '../domain/metrics'
import {
  useDuplicates,
  useMetricsTickets,
  usePausesByReason,
  useSatisfaction,
  useSla,
} from '../hooks/use-metrics'
import { metricsMessages } from '../i18n'
import { MetricsHero } from './metrics-hero'
import { MetricsTabs } from './metrics-tabs'
import { MetricsToolbar } from './metrics-toolbar'
import type { FilterCatalogs } from './metrics-toolbar'

const EMPTY_SLA: SlaSummary = {
  withTarget: 0,
  met: 0,
  complianceRate: null,
  avgTargetMinutes: null,
  avgResolutionMinutes: null,
}

const EMPTY_SATISFACTION: SatisfactionSummary = { average: null, ratings: 0 }

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

function useMetricsBoard() {
  const [filters, setFilters] = useState<MetricsFilters>(EMPTY_FILTERS)
  const [dimension, setDimension] = useState<Dimension>('team')
  const tickets = useMetricsTickets()
  const pauses = usePausesByReason()
  const duplicates = useDuplicates()
  const satisfaction = useSatisfaction()
  const sla = useSla()
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
  const filtered = filterTickets(tickets.data ?? [], filters)
  return {
    filters,
    setFilters,
    dimension,
    setDimension,
    catalogs,
    filtered,
    summary: summarize(filtered),
    rows: byDimension(filtered, dimension),
    nameOf: nameResolver(dimension, catalogs),
    loading: tickets.isLoading,
    error: tickets.isError,
    pauses: pauses.data ?? [],
    duplicates: {
      tickets: duplicates.tickets.data ?? [],
      alerts: duplicates.alerts.data ?? [],
      rows: duplicates.byDimension.data ?? [],
    },
    satisfaction: satisfaction.data ?? EMPTY_SATISFACTION,
    sla: sla.summary.data ?? EMPTY_SLA,
    slaRows: sla.byPriority.data ?? [],
  }
}

/** Tablero de indicadores agrupado por tema. */
export function MetricsDashboard() {
  const board = useMetricsBoard()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={metricsMessages.title}
        description={metricsMessages.subtitle}
      />
      <div className="sticky top-16 z-20">
        <MetricsToolbar
          filters={board.filters}
          catalogs={board.catalogs}
          dimension={board.dimension}
          rows={board.rows}
          nameOf={board.nameOf}
          onFiltersChange={board.setFilters}
          onDimensionChange={board.setDimension}
        />
      </div>
      {board.loading ? <LoadingList rows={4} /> : null}
      {board.error ? <ErrorAlert message={metricsMessages.error} /> : null}
      {!board.loading && !board.error && board.filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : null}
      {board.filtered.length > 0 ? (
        <>
          <MetricsHero
            summary={board.summary}
            satisfaction={board.satisfaction}
            sla={board.sla}
          />
          <MetricsTabs
            filtered={board.filtered}
            summary={board.summary}
            rows={board.rows}
            nameOf={board.nameOf}
            pauses={board.pauses}
            duplicates={board.duplicates}
            sla={board.sla}
            slaRows={board.slaRows}
            satisfaction={board.satisfaction}
          />
        </>
      ) : null}
    </div>
  )
}
