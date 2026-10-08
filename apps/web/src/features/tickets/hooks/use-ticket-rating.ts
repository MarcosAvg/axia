import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRating, rateTicket } from '../api/rating-api'
import type { RatingInput } from '../schemas'

const ratingKey = (ticketId: string) => ['tickets', 'rating', ticketId] as const

/** Calificación de satisfacción del tiquet. */
export function useTicketRating(ticketId: string | undefined) {
  return useQuery({
    queryKey: ratingKey(ticketId ?? ''),
    queryFn: () => (ticketId ? fetchRating(ticketId) : Promise.resolve(null)),
    enabled: Boolean(ticketId),
  })
}

/** Envía (o actualiza) la calificación del tiquet. */
export function useRateTicket(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { input: RatingInput; clientRequestId: string }) =>
      rateTicket(ticketId, variables.input, variables.clientRequestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
