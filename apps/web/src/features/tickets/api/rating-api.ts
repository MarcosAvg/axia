// Calificación de satisfacción de un tiquet (RPC ticket_rate).

import { supabase } from '@/lib/supabase'
import type { TicketRating } from '../domain/types'
import { parseRating } from '../schemas'
import type { RatingInput } from '../schemas'

export async function fetchRating(
  ticketId: string,
): Promise<TicketRating | null> {
  const { data, error } = await supabase
    .from('ticket_ratings')
    .select('score, comment')
    .eq('ticket_id', ticketId)
    .maybeSingle()
  if (error) throw error
  return data ? parseRating(data) : null
}

export async function rateTicket(
  ticketId: string,
  input: RatingInput,
  clientRequestId: string,
): Promise<void> {
  const { error } = await supabase.rpc('ticket_rate', {
    p_ticket_id: ticketId,
    p_score: input.score,
    p_comment: input.comment || undefined,
    p_client_request_id: clientRequestId,
  })
  if (error) throw error
}
