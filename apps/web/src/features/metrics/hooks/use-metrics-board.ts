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
  usePauseSubstates,
  useRejectCancel,
  useRouting,
  useSatisfaction,
  useSla,
  useSupervisors,
  useTechnicianTimes,
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

/** Consultas del tablero, separadas del estado y los catálogos. */
function useMetricsData(filters: MetricsFilters) {
  const current = useMetricsSummary(filters)
  const prevFilters = previousRange(filters)
  const previous = useMetricsSummary(prevFilters ?? EMPTY_FILTERS, {
    compact: true,
    enabled: Boolean(prevFilters),
  })
  return {
    current,
    prevFilters,
    previous,
    pauses: usePausesByReason(filters),
    duplicates: useDuplicates(filters),
    satisfaction: useSatisfaction(filters),
    sla: useSla(filters),
    technicians: useByTechnician(filters),
    technicianTimes: useTechnicianTimes(filters),
    supervisors: useSupervisors(filters),
    pauseSubstates: usePauseSubstates(filters),
    rejectCancel: useRejectCancel(filters),
    routing: useRouting(filters),
  }
}

/** Estado y datos del tablero de métricas. */
export function useMetricsBoard() {
  const [filters, setFilters] = useState<MetricsFilters>(EMPTY_FILTERS)
  const data = useMetricsData(filters)
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
    data.prevFilters && data.previous.data
      ? {
          summary: data.previous.data.summary,
          label: formatRangeLabel(data.prevFilters.from, data.prevFilters.to),
        }
      : null

  return {
    filters,
    setFilters,
    catalogs,
    summary: or(data.current.data?.summary, EMPTY_SUMMARY),
    volume: or(data.current.data?.volume, []),
    aging: or(data.current.data?.aging, []),
    comparison,
    groups: or(data.current.data?.groups, []),
    satisfactionDistribution: or(
      data.current.data?.satisfactionDistribution,
      [0, 0, 0, 0, 0],
    ),
    loading: data.current.isLoading,
    error: data.current.isError,
    pauses: or(data.pauses.data, []),
    pauseSubstates: or(data.pauseSubstates.data, []),
    duplicates: {
      tickets: or(data.duplicates.tickets.data, []),
      alerts: or(data.duplicates.alerts.data, []),
      rows: or(data.duplicates.byDimension.data, []),
    },
    satisfaction: or(data.satisfaction.data, EMPTY_SATISFACTION),
    sla: or(data.sla.summary.data, EMPTY_SLA),
    slaRows: or(data.sla.byPriority.data, []),
    technicians: or(data.technicians.data, []),
    technicianTimes: or(data.technicianTimes.data, []),
    supervisors: or(data.supervisors.data, []),
    rejectCancel: or(data.rejectCancel.data, []),
    routing: or(data.routing.data, EMPTY_ROUTING),
  }
}
