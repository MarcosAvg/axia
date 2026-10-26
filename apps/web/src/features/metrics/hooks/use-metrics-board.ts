import { useState } from 'react'
import {
  useBuildings,
  useCategories,
  useDependencies,
  useRequesters,
  useTeams,
} from '@/features/catalogs'
import type { Option, RequesterOption } from '@/features/catalogs'
import type { FilterCatalogs, RoutingSummary } from '../domain/indicators'
import { EMPTY_FILTERS, EMPTY_SUMMARY } from '../domain/metrics'
import type {
  Dimension,
  MetricsFilters,
  SatisfactionSummary,
  SlaSummary,
} from '../domain/metrics'
import { formatRangeLabel, previousRange } from '../domain/period'
import type { Comparison } from '../domain/period'
import {
  useByTechnician,
  useDuplicates,
  useMetricsSummary,
  usePausesByReason,
  useRejectCancel,
  useRouting,
  useSatisfaction,
  useSla,
} from './use-metrics'

const EMPTY_SLA: SlaSummary = {
  withTarget: 0,
  met: 0,
  complianceRate: null,
  avgTargetMinutes: null,
  avgResolutionMinutes: null,
}

const EMPTY_SATISFACTION: SatisfactionSummary = { average: null, ratings: 0 }

const EMPTY_ROUTING: RoutingSummary = {
  offers: 0,
  pendingOffers: 0,
  taken: 0,
  avgTimeToTakeMinutes: 0,
}

function or<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback
}

function buildCatalogs(options: {
  buildings: Option[] | undefined
  teams: Option[] | undefined
  categories: Option[] | undefined
  dependencies: Option[] | undefined
  requesters: RequesterOption[] | undefined
}): FilterCatalogs {
  return {
    buildings: or(options.buildings, []),
    teams: or(options.teams, []),
    categories: or(options.categories, []),
    dependencies: or(options.dependencies, []),
    requesters: or(options.requesters, []).map((item) => ({
      id: item.id,
      name: item.fullName,
    })),
  }
}

function nameResolver(catalogs: FilterCatalogs) {
  const maps: Record<Dimension, Map<string, string>> = {
    team: new Map(catalogs.teams.map((item) => [item.id, item.name])),
    building: new Map(catalogs.buildings.map((item) => [item.id, item.name])),
    category: new Map(catalogs.categories.map((item) => [item.id, item.name])),
    dependency: new Map(
      catalogs.dependencies.map((item) => [item.id, item.name]),
    ),
    requester: new Map(catalogs.requesters.map((item) => [item.id, item.name])),
  }
  return (dimension: Dimension, id: string) => maps[dimension].get(id) ?? id
}

/** Estado y datos del tablero de métricas. */
export function useMetricsBoard() {
  const [filters, setFilters] = useState<MetricsFilters>(EMPTY_FILTERS)
  const current = useMetricsSummary(filters)
  const prevFilters = previousRange(filters)
  const previous = useMetricsSummary(prevFilters ?? EMPTY_FILTERS, {
    compact: true,
    enabled: Boolean(prevFilters),
  })
  const pauses = usePausesByReason(filters)
  const duplicates = useDuplicates(filters)
  const satisfaction = useSatisfaction(filters)
  const sla = useSla(filters)
  const technicians = useByTechnician(filters)
  const rejectCancel = useRejectCancel(filters)
  const routing = useRouting(filters)
  const buildings = useBuildings()
  const teams = useTeams()
  const categories = useCategories()
  const dependencies = useDependencies()
  const requesters = useRequesters()

  const catalogs = buildCatalogs({
    buildings: buildings.data,
    teams: teams.data,
    categories: categories.data,
    dependencies: dependencies.data,
    requesters: requesters.data,
  })
  const comparison: Comparison | null =
    prevFilters && previous.data
      ? {
          summary: previous.data.summary,
          label: formatRangeLabel(prevFilters.from, prevFilters.to),
        }
      : null

  return {
    filters,
    setFilters,
    catalogs,
    summary: or(current.data?.summary, EMPTY_SUMMARY),
    volume: or(current.data?.volume, []),
    aging: or(current.data?.aging, []),
    comparison,
    groups: or(current.data?.groups, []),
    nameOf: nameResolver(catalogs),
    loading: current.isLoading,
    error: current.isError,
    pauses: or(pauses.data, []),
    duplicates: {
      tickets: or(duplicates.tickets.data, []),
      alerts: or(duplicates.alerts.data, []),
      rows: or(duplicates.byDimension.data, []),
    },
    satisfaction: or(satisfaction.data, EMPTY_SATISFACTION),
    sla: or(sla.summary.data, EMPTY_SLA),
    slaRows: or(sla.byPriority.data, []),
    technicians: or(technicians.data, []),
    rejectCancel: or(rejectCancel.data, []),
    routing: or(routing.data, EMPTY_ROUTING),
  }
}
