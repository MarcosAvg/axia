import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchManualTimeContext,
  recordManualTime,
  voidManualTime,
} from '../api/time-api'
import type { ManualTimeInput } from '../schemas'

const manualTimeKey = (ticketId: string) =>
  ['tickets', 'manual-time', ticketId] as const

function useInvalidateManualTime(ticketId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: manualTimeKey(ticketId) })
    void queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }
}

/** Tramos manuales y tramo abierto del tiquet. */
export function useManualTime(ticketId: string | undefined) {
  return useQuery({
    queryKey: manualTimeKey(ticketId ?? ''),
    queryFn: () => fetchManualTimeContext(ticketId as string),
    enabled: Boolean(ticketId),
  })
}

/** Alta de un tramo manual (supervisor/admin). */
export function useRecordManualTime(ticketId: string) {
  const invalidate = useInvalidateManualTime(ticketId)
  return useMutation({
    mutationFn: (variables: {
      input: ManualTimeInput
      clientRequestId: string
    }) =>
      recordManualTime(ticketId, variables.input, variables.clientRequestId),
    onSuccess: invalidate,
  })
}

/** Anulación de un tramo manual (corrección). */
export function useVoidManualTime(ticketId: string) {
  const invalidate = useInvalidateManualTime(ticketId)
  return useMutation({
    mutationFn: (variables: { spanId: string; clientRequestId: string }) =>
      voidManualTime(ticketId, variables.spanId, variables.clientRequestId),
    onSuccess: invalidate,
  })
}
