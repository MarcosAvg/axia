import { sql } from 'drizzle-orm'
import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { notFound } from '../tickets/action-shared.js'
import { runTicketAction } from '../tickets/actions.js'
import { withActionContext } from '../tickets/event-context.js'
import type { TicketActionInput } from '../tickets/schemas.js'

async function findSyncedEvent(
  db: Database,
  ticketId: string,
  clientRequestId: string,
) {
  const result = await db.execute(sql`
    select actor_id, occurred_at
    from public.ticket_events
    where ticket_id = ${ticketId} and client_request_id = ${clientRequestId}
    limit 1
  `)
  return result.rows[0] as
    { actor_id: string | null; occurred_at: Date | string } | undefined
}

export async function replayPreviouslyApplied(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
) {
  const event = await findSyncedEvent(db, ticketId, input.clientRequestId)
  if (!event) return
  if (event.actor_id !== actor.id) {
    throw notFound()
  }

  // El manejador comprueba el tipo del evento y el alcance actual del actor.
  return withActionContext(
    {
      occurredAt: new Date(event.occurred_at).toISOString(),
      clientReportedAt: null,
      timeConfidence: 'trusted',
      clientClockSkewMs: null,
      timeAlertKind: null,
      suggestedOccurredAt: null,
    },
    () => runTicketAction(db, actor, ticketId, input),
  )
}
