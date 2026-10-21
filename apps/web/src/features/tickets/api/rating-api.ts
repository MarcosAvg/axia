import { apiFetch, ApiError } from '@/lib/api-client'
import type { TicketRating } from '../domain/types'
import type { RatingInput } from '../schemas'
import { ticketAction } from './rpc'

export async function fetchRating(
  ticketId: string,
): Promise<TicketRating | null> {
  try {
    const body = await apiFetch<{ item: TicketRating | null }>(
      `/api/tickets/${ticketId}/rating`,
    )
    return body.item
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function rateTicket(
  ticketId: string,
  input: RatingInput,
  clientRequestId: string,
): Promise<void> {
  await ticketAction(ticketId, 'rate', clientRequestId, {
    score: input.score,
    comment: input.comment || undefined,
  })
}
