import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TimeMeasure } from '@/lib/time-measure'
import type { MetricsFilters } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import {
  fetchAuxiliaryByCategory,
  fetchPauseSubstates,
  fetchRejectCancel,
  fetchSupervisors,
  fetchTechnicianTimes,
} from '../api/indicators-api'
import {
  fetchByTechnician,
  fetchDistributionProfile,
  fetchDuplicateAlerts,
  fetchDuplicateTickets,
  fetchDuplicatesByDimension,
  fetchMetricsSummary,
  fetchPausesByReason,
  fetchRequesterTimes,
  fetchRouting,
  fetchSatisfaction,
  fetchSla,
  fetchSlaByPriority,
  fetchTechnicianSubjectTimes,
} from '../api/metrics-api'

const metricsKeys = {
  summary: ['metrics', 'summary'] as const,
  distributionProfile: ['metrics', 'distribution-profile'] as const,
  pauses: ['metrics', 'pauses'] as const,
  duplicateTickets: ['metrics', 'duplicate-tickets'] as const,
  duplicateAlerts: ['metrics', 'duplicate-alerts'] as const,
  duplicatesByDimension: ['metrics', 'duplicates-by-dimension'] as const,
  satisfaction: ['metrics', 'satisfaction'] as const,
  sla: ['metrics', 'sla'] as const,
  slaByPriority: ['metrics', 'sla-by-priority'] as const,
  byTechnician: ['metrics', 'by-technician'] as const,
  technicianTimes: ['metrics', 'technician-times'] as const,
  technicianSubjectTimes: ['metrics', 'technician-subject-times'] as const,
  requesterTimes: ['metrics', 'requester-times'] as const,
  supervisors: ['metrics', 'supervisors'] as const,
  pauseSubstates: ['metrics', 'pause-substates'] as const,
  rejectCancel: ['metrics', 'reject-cancel'] as const,
  routing: ['metrics', 'routing'] as const,
  auxiliaryByCategory: ['metrics', 'auxiliary-by-category'] as const,
}

function useFilteredQuery<T>(
  key: readonly unknown[],
  filters: MetricsFilters,
  fn: (filters: MetricsFilters) => Promise<T>,
  enabled = true,
) {
  return useQuery({
    queryKey: [...key, filters],
    queryFn: () => fn(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useMetricsSummary(
  filters: MetricsFilters,
  options: {
    compact?: boolean
    enabled?: boolean
    measure?: TimeMeasure
    mode?: TimeMode
  } = {},
) {
  const compact = options.compact ?? false
  const measure = options.measure ?? 'average'
  const mode = options.mode ?? 'calendar'
  return useQuery({
    queryKey: [...metricsKeys.summary, filters, compact, measure, mode],
    queryFn: () => fetchMetricsSummary(filters, { compact, measure, mode }),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useDistributionProfile(
  filters: MetricsFilters,
  mode: TimeMode,
  enabled = true,
) {
  return useQuery({
    queryKey: [...metricsKeys.distributionProfile, filters, mode],
    queryFn: () => fetchDistributionProfile(filters, mode),
    placeholderData: keepPreviousData,
    enabled,
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

export function useSatisfaction(filters: MetricsFilters, enabled = true) {
  return useFilteredQuery(
    metricsKeys.satisfaction,
    filters,
    fetchSatisfaction,
    enabled,
  )
}

export function useSla(filters: MetricsFilters, enabled = true) {
  return {
    summary: useFilteredQuery(metricsKeys.sla, filters, fetchSla, enabled),
    byPriority: useFilteredQuery(
      metricsKeys.slaByPriority,
      filters,
      fetchSlaByPriority,
      enabled,
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

export function useTechnicianTimes(filters: MetricsFilters) {
  return useFilteredQuery(
    metricsKeys.technicianTimes,
    filters,
    fetchTechnicianTimes,
  )
}

export function useTechnicianSubjectTimes(filters: MetricsFilters) {
  return useFilteredQuery(
    metricsKeys.technicianSubjectTimes,
    filters,
    fetchTechnicianSubjectTimes,
  )
}

export function useRequesterTimes(filters: MetricsFilters) {
  return useFilteredQuery(
    metricsKeys.requesterTimes,
    filters,
    fetchRequesterTimes,
  )
}

export function useAuxiliaryByCategory(filters: MetricsFilters) {
  return useFilteredQuery(
    metricsKeys.auxiliaryByCategory,
    filters,
    fetchAuxiliaryByCategory,
  )
}

export function useSupervisors(filters: MetricsFilters) {
  return useFilteredQuery(metricsKeys.supervisors, filters, fetchSupervisors)
}

export function usePauseSubstates(filters: MetricsFilters) {
  return useFilteredQuery(
    metricsKeys.pauseSubstates,
    filters,
    fetchPauseSubstates,
  )
}
