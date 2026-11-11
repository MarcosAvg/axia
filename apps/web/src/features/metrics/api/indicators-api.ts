import type {
  AuxiliaryCategoryRow,
  PauseSubstateRow,
  RejectCancelRow,
  SupervisorRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type { MetricsFilters } from '../domain/metrics'
import { intervalToMinutes } from '../domain/metrics'
import { fetchItems } from './metrics-api'
import { toNumber } from './numbers'

export async function fetchTechnicianTimes(
  filters: MetricsFilters,
): Promise<TechnicianTimeRow[]> {
  const items = await fetchItems<{
    technician_id: string
    technician_name: string
    tickets: number
    avg_active: number
    avg_active_labor: number
    avg_total: number
    avg_total_labor: number
    avg_response: number
    avg_response_labor: number
    avg_assignment: number
    avg_assignment_labor: number
    avg_validation: number
    avg_validation_labor: number
  }>('/api/metrics/technician-times', filters)
  return items.map((row) => ({
    technicianId: row.technician_id,
    name: row.technician_name,
    tickets: toNumber(row.tickets),
    avgActive: toNumber(row.avg_active),
    avgActiveLabor: toNumber(row.avg_active_labor),
    avgTotal: toNumber(row.avg_total),
    avgTotalLabor: toNumber(row.avg_total_labor),
    avgResponse: toNumber(row.avg_response),
    avgResponseLabor: toNumber(row.avg_response_labor),
    avgAssignment: toNumber(row.avg_assignment),
    avgAssignmentLabor: toNumber(row.avg_assignment_labor),
    avgValidation: toNumber(row.avg_validation),
    avgValidationLabor: toNumber(row.avg_validation_labor),
  }))
}

export async function fetchSupervisors(
  filters: MetricsFilters,
): Promise<SupervisorRow[]> {
  const items = await fetchItems<{
    supervisor_id: string
    supervisor_name: string
    offers: number
    taken: number
    pending: number
    withdrawn: number
    avg_time_to_take: number
    reassigned: number
    validated: number
  }>('/api/metrics/supervisors', filters)
  return items.map((row) => ({
    supervisorId: row.supervisor_id,
    name: row.supervisor_name,
    offers: toNumber(row.offers),
    taken: toNumber(row.taken),
    pending: toNumber(row.pending),
    withdrawn: toNumber(row.withdrawn),
    avgTimeToTakeMinutes: toNumber(row.avg_time_to_take),
    reassigned: toNumber(row.reassigned),
    validated: toNumber(row.validated),
  }))
}

export async function fetchPauseSubstates(
  filters: MetricsFilters,
): Promise<PauseSubstateRow[]> {
  const items = await fetchItems<{
    substate_name: string
    pauses: number
    pause_minutes: number
  }>('/api/metrics/pause-substates', filters)
  return items.map((row) => ({
    name: row.substate_name,
    pauses: toNumber(row.pauses),
    pauseMinutes: toNumber(row.pause_minutes),
  }))
}

export async function fetchAuxiliaryByCategory(
  filters: MetricsFilters,
): Promise<AuxiliaryCategoryRow[]> {
  const items = await fetchItems<{
    technician_id: string
    technician_name: string
    category_id: string | null
    category_name: string | null
    tickets: number
    participation_time: string | null
    participation_time_labor: string | null
  }>('/api/metrics/auxiliary-by-category', filters)
  return items.map((row) => ({
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    tickets: toNumber(row.tickets),
    minutes: intervalToMinutes(row.participation_time),
    laborMinutes: intervalToMinutes(row.participation_time_labor),
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
