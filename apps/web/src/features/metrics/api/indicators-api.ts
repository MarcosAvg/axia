import type {
  PauseSubstateRow,
  SupervisorRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type { MetricsFilters } from '../domain/metrics'
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
    avg_total: number
    avg_response: number
    avg_assignment: number
    avg_validation: number
  }>('/api/metrics/technician-times', filters)
  return items.map((row) => ({
    technicianId: row.technician_id,
    name: row.technician_name,
    tickets: toNumber(row.tickets),
    avgActive: toNumber(row.avg_active),
    avgTotal: toNumber(row.avg_total),
    avgResponse: toNumber(row.avg_response),
    avgAssignment: toNumber(row.avg_assignment),
    avgValidation: toNumber(row.avg_validation),
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
