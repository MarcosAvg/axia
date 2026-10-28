// Lectura de indicadores contra la API de Axia.

import { apiFetch } from '@/lib/api-client'
import type { DimensionGroup } from '../domain/dimensions'
import type {
  RejectCancelRow,
  RoutingSummary,
  TechnicianRow,
} from '../domain/indicators'
import { intervalToMinutes } from '../domain/metrics'
import { toNullableNumber, toNumber } from './numbers'
import type {
  AgingRow,
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsFilters,
  MetricsSummary,
  PauseReasonRow,
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
  VolumePoint,
} from '../domain/metrics'

interface MetricsAggregate {
  summary: MetricsSummary
  groups: DimensionGroup[]
  volume: VolumePoint[]
  aging: AgingRow[]
  satisfactionDistribution: number[]
}

function filtersQuery(filters: MetricsFilters) {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.buildingId) params.set('buildingId', filters.buildingId)
  if (filters.teamId) params.set('teamId', filters.teamId)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.dependencyId) params.set('dependencyId', filters.dependencyId)
  return params.toString()
}

export async function fetchItems<T>(
  path: string,
  filters?: MetricsFilters,
): Promise<T[]> {
  const query = filters ? filtersQuery(filters) : ''
  const body = await apiFetch<{ items: T[] }>(query ? `${path}?${query}` : path)
  return body.items
}

export async function fetchMetricsSummary(
  filters: MetricsFilters,
  compact = false,
): Promise<MetricsAggregate> {
  const params = new URLSearchParams(filtersQuery(filters))
  if (compact) params.set('compact', '1')
  const query = params.toString()
  return apiFetch<MetricsAggregate>(
    query ? `/api/metrics/summary?${query}` : '/api/metrics/summary',
  )
}

export async function fetchPausesByReason(
  filters: MetricsFilters,
): Promise<PauseReasonRow[]> {
  const items = await fetchItems<{
    reason_name: string
    pauses: number
    pause_time: string | null
    pause_time_labor: string | null
  }>('/api/metrics/pauses', filters)
  return items.map((row) => ({
    reasonName: row.reason_name,
    pauses: toNumber(row.pauses),
    pauseMinutes: intervalToMinutes(row.pause_time),
    pauseLaborMinutes: intervalToMinutes(row.pause_time_labor),
  }))
}

export async function fetchDuplicateTickets(
  filters: MetricsFilters,
): Promise<DuplicateTicket[]> {
  const items = await fetchItems<{ time_to_mark: string | null }>(
    '/api/metrics/duplicate-tickets',
    filters,
  )
  return items.map((row) => ({
    timeToMarkMinutes: intervalToMinutes(row.time_to_mark),
  }))
}

export async function fetchDuplicateAlerts(
  filters: MetricsFilters,
): Promise<DuplicateAlert[]> {
  const items = await fetchItems<{
    decision: string
    candidates: number
    tickets: number
  }>('/api/metrics/duplicate-alerts', filters)
  return items.map((row) => ({
    decision: row.decision,
    candidates: toNumber(row.candidates),
    tickets: toNumber(row.tickets),
  }))
}

export async function fetchDuplicatesByDimension(
  filters: MetricsFilters,
): Promise<DuplicateDimensionRow[]> {
  const items = await fetchItems<{
    dimension: string
    dimension_id: string
    dimension_name: string | null
    tickets: number
    duplicates: number
    duplicate_rate: number
  }>('/api/metrics/duplicates-by-dimension', filters)
  return items.map((row) => ({
    dimension: row.dimension,
    dimensionId: row.dimension_id,
    dimensionName: row.dimension_name,
    tickets: toNumber(row.tickets),
    duplicates: toNumber(row.duplicates),
    duplicateRate: toNumber(row.duplicate_rate),
  }))
}

export async function fetchSatisfaction(
  filters: MetricsFilters,
): Promise<SatisfactionSummary> {
  const item = (
    await fetchItems<{ average_score: number | null; ratings: number }>(
      '/api/metrics/satisfaction',
      filters,
    )
  )[0]
  return {
    average: toNullableNumber(item?.average_score),
    ratings: toNumber(item?.ratings),
  }
}

interface SlaRow {
  with_target: number | null
  met: number | null
  compliance_rate: number | null
  avg_target_minutes: number | null
  avg_resolution_minutes: number | null
}

const EMPTY_SLA_ROW: SlaRow = {
  with_target: 0,
  met: 0,
  compliance_rate: null,
  avg_target_minutes: null,
  avg_resolution_minutes: null,
}

function toSla(row: SlaRow | undefined): SlaSummary {
  const data = row ?? EMPTY_SLA_ROW
  return {
    withTarget: toNumber(data.with_target),
    met: toNumber(data.met),
    complianceRate: toNullableNumber(data.compliance_rate),
    avgTargetMinutes: toNullableNumber(data.avg_target_minutes),
    avgResolutionMinutes: toNullableNumber(data.avg_resolution_minutes),
  }
}

export async function fetchSla(filters: MetricsFilters): Promise<SlaSummary> {
  return toSla((await fetchItems<SlaRow>('/api/metrics/sla', filters))[0])
}

export async function fetchSlaByPriority(
  filters: MetricsFilters,
): Promise<SlaPriorityRow[]> {
  const items = await fetchItems<{
    priority_id: string
    priority_name: string
    with_target: number
    met: number
    compliance_rate: number | null
  }>('/api/metrics/sla-by-priority', filters)
  return items.map((row) => ({
    priorityId: row.priority_id,
    priorityName: row.priority_name,
    withTarget: toNumber(row.with_target),
    met: toNumber(row.met),
    complianceRate: toNullableNumber(row.compliance_rate),
  }))
}

export async function fetchByTechnician(
  filters: MetricsFilters,
): Promise<TechnicianRow[]> {
  const items = await fetchItems<{
    technician_id: string
    technician_name: string
    tickets: number
    leader_count: number
    auxiliary_count: number
    participation_time: string | null
    participation_time_labor: string | null
    participation_time_extra: string | null
    assigned_count: number
  }>('/api/metrics/by-technician', filters)
  return items.map((row) => ({
    technicianId: row.technician_id,
    name: row.technician_name,
    tickets: toNumber(row.tickets),
    leaderCount: toNumber(row.leader_count),
    auxiliaryCount: toNumber(row.auxiliary_count),
    participationMinutes: intervalToMinutes(row.participation_time),
    participationLaborMinutes: intervalToMinutes(row.participation_time_labor),
    participationExtraMinutes: intervalToMinutes(row.participation_time_extra),
    assignedCount: toNumber(row.assigned_count),
  }))
}

export async function fetchRejectCancel(
  filters: MetricsFilters,
): Promise<RejectCancelRow[]> {
  const items = await fetchItems<{
    event_type: string
    reason_name: string
    tickets: number
  }>('/api/metrics/reject-cancel', filters)
  return items.map((row) => ({
    eventType: row.event_type,
    reasonName: row.reason_name,
    tickets: toNumber(row.tickets),
  }))
}

export async function fetchRouting(
  filters: MetricsFilters,
): Promise<RoutingSummary> {
  const row = (
    await fetchItems<{
      offers: number
      pending_offers: number
      taken: number
      avg_time_to_take: string | null
    }>('/api/metrics/routing', filters)
  )[0]
  return {
    offers: toNumber(row?.offers),
    pendingOffers: toNumber(row?.pending_offers),
    taken: toNumber(row?.taken),
    avgTimeToTakeMinutes: intervalToMinutes(row?.avg_time_to_take),
  }
}
