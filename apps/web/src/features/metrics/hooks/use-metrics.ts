import { useQuery } from '@tanstack/react-query'
import { fetchMetricsTickets, fetchPausesByReason } from '../api/metrics-api'

const metricsKeys = {
  tickets: ['metrics', 'tickets'] as const,
  pauses: ['metrics', 'pauses'] as const,
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
