import { useQuery } from '@tanstack/react-query'
import {
  fetchDuplicateAlerts,
  fetchDuplicateTickets,
  fetchDuplicatesByDimension,
  fetchMetricsTickets,
  fetchPausesByReason,
  fetchSatisfaction,
} from '../api/metrics-api'

const metricsKeys = {
  tickets: ['metrics', 'tickets'] as const,
  pauses: ['metrics', 'pauses'] as const,
  duplicateTickets: ['metrics', 'duplicate-tickets'] as const,
  duplicateAlerts: ['metrics', 'duplicate-alerts'] as const,
  duplicatesByDimension: ['metrics', 'duplicates-by-dimension'] as const,
  satisfaction: ['metrics', 'satisfaction'] as const,
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
