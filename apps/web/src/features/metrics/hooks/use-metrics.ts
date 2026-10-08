import { useQuery } from '@tanstack/react-query'
import {
  fetchDuplicateAlerts,
  fetchDuplicateTickets,
  fetchDuplicatesByDimension,
  fetchMetricsTickets,
  fetchPausesByReason,
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
}

export function useMetricsTickets() {
  return useQuery({
    queryKey: metricsKeys.tickets,
    queryFn: fetchMetricsTickets,
  })
}

export function usePausesByReason() {
  return useQuery({
    queryKey: metricsKeys.pauses,
    queryFn: fetchPausesByReason,
  })
}

export function useDuplicates() {
  const tickets = useQuery({
    queryKey: metricsKeys.duplicateTickets,
    queryFn: fetchDuplicateTickets,
  })
  const alerts = useQuery({
    queryKey: metricsKeys.duplicateAlerts,
    queryFn: fetchDuplicateAlerts,
  })
  const byDimension = useQuery({
    queryKey: metricsKeys.duplicatesByDimension,
    queryFn: fetchDuplicatesByDimension,
  })
  return { tickets, alerts, byDimension }
}

export function useSatisfaction() {
  return useQuery({
    queryKey: metricsKeys.satisfaction,
    queryFn: fetchSatisfaction,
  })
}

export function useSla() {
  const summary = useQuery({
    queryKey: metricsKeys.sla,
    queryFn: fetchSla,
  })
  const byPriority = useQuery({
    queryKey: metricsKeys.slaByPriority,
    queryFn: fetchSlaByPriority,
  })
  return { summary, byPriority }
}
