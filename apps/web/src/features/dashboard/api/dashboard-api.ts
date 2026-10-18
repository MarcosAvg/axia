// Acceso a datos del panel. Única capa del feature que habla con Supabase.

import { supabase } from '@/lib/supabase'

export interface ActivityItem {
  id: number
  ticketId: string
  type: string
  occurredAt: string
  folio: string
  actorName: string | null
}

/** Últimos eventos visibles para el usuario (RLS), con folio y actor. */
export async function fetchRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('v_ticket_timeline')
    .select('id, ticket_id, type, occurred_at, actor_name')
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error

  const events = (data ?? []).flatMap((event) => {
    if (
      event.id === null ||
      event.ticket_id === null ||
      event.occurred_at === null ||
      event.type === null
    ) {
      return []
    }
    return [
      {
        id: event.id,
        ticket_id: event.ticket_id,
        occurred_at: event.occurred_at,
        type: event.type,
        actor_name: event.actor_name,
      },
    ]
  })
  const ticketIds = [...new Set(events.map((event) => event.ticket_id))]
  if (ticketIds.length === 0) return []

  const tickets = await supabase
    .from('tickets')
    .select('id, folio')
    .in('id', ticketIds)
  if (tickets.error) throw tickets.error

  const folios = new Map(
    (tickets.data ?? []).map((ticket) => [ticket.id, ticket.folio]),
  )
  return events.map((event) => ({
    id: event.id,
    ticketId: event.ticket_id,
    type: event.type,
    occurredAt: event.occurred_at,
    folio: folios.get(event.ticket_id) ?? '',
    actorName: event.actor_name,
  }))
}
