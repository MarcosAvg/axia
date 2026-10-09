import { useQuery } from '@tanstack/react-query'
import type { MetricsFilters } from '../domain/metrics'
import {
  fetchByTechnician,
  fetchDuplicateAlerts,
  fetchDuplicateTickets,
  fetchDuplicatesByDimension,
  fetchMetricsTickets,
  fetchPausesByReason,
  fetchRejectCancel,
  fetchRouting,
  fetchSatisfaction,
  fetchSla,
  fetchSlaByPriority,
} from '../api/metrics-api'

const metricsKeys = {
  tickets: ['metrics', 'tickets'] as const,
  pauses: ['metrics', 'pauses'] as const,
  duplicateTickets: ['metrics', 'duplicate-tickets'] as const,
  duplicateAlerts: ['metrics', 'duplicate-alerts'] as const,
  duplicatesByDimension: ['metrics', 'duplicates-by-dimension'] as const,
  satisfaction: ['metrics', 'satisfaction'] as const,
  sla: ['metrics', 'sla'] as const,
  slaByPriority: ['metrics', 'sla-by-priority'] as const,
  byTechnician: ['metrics', 'by-technician'] as const,
  rejectCancel: ['metrics', 'reject-cancel'] as const,
  routing: ['metrics', 'routing'] as const,
}

export function useMetricsTickets() {
  return useQuery({
    queryKey: metricsKeys.tickets,
    queryFn: fetchMetricsTickets,
  })
}

export function usePausesByReason(filters: MetricsFilters) {
  return useQuery({
    queryKey: [...metricsKeys.pauses, filters],
    queryFn: () => fetchPausesByReason(filters),
  })
}

export function useDuplicates(filters: MetricsFilters) {
  const tickets = useQuery({
    queryKey: [...metricsKeys.duplicateTickets, filters],
    queryFn: () => fetchDuplicateTickets(filters),
  })
  const alerts = useQuery({
    queryKey: [...metricsKeys.duplicateAlerts, filters],
    queryFn: () => fetchDuplicateAlerts(filters),
  })
  const byDimension = useQuery({
    queryKey: [...metricsKeys.duplicatesByDimension, filters],
    queryFn: () => fetchDuplicatesByDimension(filters),
  })
  return { tickets, alerts, byDimension }
}

export function useSatisfaction(filters: MetricsFilters) {
  return useQuery({
    queryKey: [...metricsKeys.satisfaction, filters],
    queryFn: () => fetchSatisfaction(filters),
  })
}

export function useSla(filters: MetricsFilters) {
  const summary = useQuery({
    queryKey: [...metricsKeys.sla, filters],
    queryFn: () => fetchSla(filters),
  })
  const byPriority = useQuery({
    queryKey: [...metricsKeys.slaByPriority, filters],
    queryFn: () => fetchSlaByPriority(filters),
  })
  return { summary, byPriority }
}

export function useByTechnician(filters: MetricsFilters) {
  return useQuery({
    queryKey: [...metricsKeys.byTechnician, filters],
    queryFn: () => fetchByTechnician(filters),
  })
}

export function useRejectCancel(filters: MetricsFilters) {
  return useQuery({
    queryKey: [...metricsKeys.rejectCancel, filters],
    queryFn: () => fetchRejectCancel(filters),
  })
}

export function useRouting(filters: MetricsFilters) {
  return useQuery({
    queryKey: [...metricsKeys.routing, filters],
    queryFn: () => fetchRouting(filters),
  })
}
