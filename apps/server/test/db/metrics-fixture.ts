import { sql } from 'drizzle-orm'
import type { TicketHttpContext } from './tickets-http-helpers.js'

/** Datos cerrados y finitos para comprobar el contrato agregado sin depender del reloj. */
export async function seedMetrics(context: TicketHttpContext) {
  const { db, ids } = context
  await db.execute(sql`
    insert into public.ticket_ratings (ticket_id, score)
    values (${ids.ticketA1}, 5), (${ids.ticketA2}, 3), (${ids.ticketB1}, 1)
  `)
  await db.execute(sql`
    insert into public.ticket_duplicate_candidates
      (ticket_id, candidate_ticket_id, similarity, decision)
    values (${ids.ticketA1}, ${ids.ticketA2}, 0.9, 'ignored'),
      (${ids.ticketB1}, ${ids.ticketA2}, 0.8, 'ignored')
  `)
  await db.execute(sql`
    insert into public.ticket_pauses
      (ticket_id, cycle, reason_id, root_reason_id, opened_at, closed_at)
    select t.id, 1, r.id, r.id,
      '2026-01-01T10:00:00Z', '2026-01-01T11:30:00Z'
    from public.tickets t
    cross join lateral (select id from public.reasons where use = 'pause' and parent_id is null limit 1) r
    where t.id in (${ids.ticketA1}, ${ids.ticketB1})
  `)
}
