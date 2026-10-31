import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRating } from '../api/rating-api'
import { sendTicketCommand } from '../api/ticket-commands'
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
      sendTicketCommand({
        ticketId,
        clientRequestId: variables.clientRequestId,
        operation: 'rate',
        args: variables.input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
