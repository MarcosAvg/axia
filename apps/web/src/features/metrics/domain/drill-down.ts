import type { TicketListFilters, TicketListSearch } from '@/features/tickets'
import type {
  Dimension,
  DistributionProfileRow,
  MetricsFilters,
} from './metrics'
import type { TimeMode } from './time-mode'

export type DrillDownSpec = {
  title: string
  filters: TicketListFilters
}

const DIMENSION_FILTER: Partial<Record<Dimension, keyof TicketListFilters>> = {
  team: 'teamId',
  building: 'buildingId',
  location: 'locationId',
  category: 'categoryId',
  subcategory: 'subcategoryId',
  problem: 'problemId',
  dependency: 'dependencyId',
  requester: 'requesterId',
  priority: 'priorityId',
  channel: 'channelId',
  service_type: 'serviceTypeId',
}

/** Filtros de lista que reproducen una fila de dimensión del tablero. */
export function dimensionTicketFilters(
  dimension: Dimension,
  id: string,
): TicketListFilters {
  if (!id) return {}
  if (dimension === 'outcome') return { outcome: id }
  if (dimension === 'status') {
    return { status: id as TicketListFilters['status'] }
  }
  const key = DIMENSION_FILTER[dimension]
  return key ? ({ [key]: id } as TicketListFilters) : {}
}

/** Filtros del tablero que también aplican a la lista de tiquets. */
export function metricsBaseFilters(filters: MetricsFilters): TicketListFilters {
  const base: TicketListFilters = {}
  if (filters.from) base.from = filters.from
  if (filters.to) base.to = filters.to
  if (filters.buildingId) base.buildingId = filters.buildingId
  if (filters.teamId) base.teamId = filters.teamId
  if (filters.categoryId) base.categoryId = filters.categoryId
  if (filters.dependencyId) base.dependencyId = filters.dependencyId
  if (filters.outcome) base.outcome = filters.outcome
  if (filters.clock) base.slaClock = filters.clock
  return base
}

const PHASE_KEYS = new Set([
  'total',
  'response',
  'assignment',
  'pending_take',
  'reassignment',
  'wait',
  'active',
  'pause',
  'validation',
  'claim',
  'dormant',
  'resolution',
])

/** Filtros para listar los tiquets que alimentan una fase del perfil. */
export function phaseTicketFilters(
  phase: string,
  mode: TimeMode,
): TicketListFilters | null {
  if (!PHASE_KEYS.has(phase) || mode === 'extra') return null
  return { phase, timeMode: mode }
}

export const PHASE_SUBSETS = [
  'all',
  'outliers',
  'above_p90',
  'above_p75',
  'central',
  'below_median',
] as const

export type PhaseSubset = (typeof PHASE_SUBSETS)[number]

/** Filtros de una fase acotados al subconjunto elegido en la tabla. */
export function phaseSubsetFilters(
  row: DistributionProfileRow,
  mode: TimeMode,
  subset: PhaseSubset,
): TicketListFilters | null {
  const base = phaseTicketFilters(row.phase, mode)
  if (!base) return null
  if (subset === 'outliers') {
    return {
      ...base,
      phaseOutsideLow: row.lowerFence,
      phaseOutsideHigh: row.upperFence,
    }
  }
  if (subset === 'above_p90') return { ...base, phaseMinutesMin: row.p90 }
  if (subset === 'above_p75') return { ...base, phaseMinutesMin: row.p75 }
  if (subset === 'central') {
    return {
      ...base,
      phaseMinutesMin: row.p25,
      phaseMinutesMax: row.p75,
    }
  }
  if (subset === 'below_median') {
    return { ...base, phaseMinutesMax: row.median }
  }
  return base
}

/** Traduce filtros de métricas a la búsqueda de la ruta `/tickets`. */
export function toTicketSearch(filters: TicketListFilters): TicketListSearch {
  const search: TicketListSearch = { page: 1 }
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue
    Object.assign(search, { [key]: value })
  }
  return search
}
