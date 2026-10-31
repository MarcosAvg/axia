import { apiFetch, ApiError } from '@/lib/api-client'
import type { TicketRating } from '../domain/types'
import { ratingResponseSchema } from '../schemas'

export async function fetchRating(
  ticketId: string,
): Promise<TicketRating | null> {
  try {
    const body = ratingResponseSchema.parse(
      await apiFetch<unknown>(`/api/tickets/${ticketId}/rating`),
    )
    return body.item
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
