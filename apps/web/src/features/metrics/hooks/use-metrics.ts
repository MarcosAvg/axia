import { keepPreviousData, useQuery } from '@tanstack/react-query'
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

function useFilteredQuery<T>(
  key: readonly unknown[],
  filters: MetricsFilters,
  fn: (filters: MetricsFilters) => Promise<T>,
) {
  return useQuery({
    queryKey: [...key, filters],
    queryFn: () => fn(filters),
    placeholderData: keepPreviousData,
  })
}

export function useMetricsTickets() {
  return useQuery({
    queryKey: metricsKeys.tickets,
    queryFn: fetchMetricsTickets,
  })
}

export function usePausesByReason(filters: MetricsFilters) {
  return useFilteredQuery(metricsKeys.pauses, filters, fetchPausesByReason)
}

export function useDuplicates(filters: MetricsFilters) {
  return {
    tickets: useFilteredQuery(
      metricsKeys.duplicateTickets,
      filters,
      fetchDuplicateTickets,
    ),
    alerts: useFilteredQuery(
      metricsKeys.duplicateAlerts,
      filters,
      fetchDuplicateAlerts,
    ),
    byDimension: useFilteredQuery(
      metricsKeys.duplicatesByDimension,
      filters,
      fetchDuplicatesByDimension,
    ),
  }
}

export function useSatisfaction(filters: MetricsFilters) {
  return useFilteredQuery(metricsKeys.satisfaction, filters, fetchSatisfaction)
}

export function useSla(filters: MetricsFilters) {
  return {
    summary: useFilteredQuery(metricsKeys.sla, filters, fetchSla),
    byPriority: useFilteredQuery(
      metricsKeys.slaByPriority,
      filters,
      fetchSlaByPriority,
    ),
  }
}

export function useByTechnician(filters: MetricsFilters) {
  return useFilteredQuery(metricsKeys.byTechnician, filters, fetchByTechnician)
}

export function useRejectCancel(filters: MetricsFilters) {
  return useFilteredQuery(metricsKeys.rejectCancel, filters, fetchRejectCancel)
}

export function useRouting(filters: MetricsFilters) {
  return useFilteredQuery(metricsKeys.routing, filters, fetchRouting)
}
