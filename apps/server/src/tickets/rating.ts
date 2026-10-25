import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { canAct } from './access.js'
import {
  conflict,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

export type RateInput = {
  ticketId: string
  score: number
  comment: string | null
  clientRequestId: string
}

async function rateInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: RateInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'rated',
    'rate',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'rated',
    'rate',
  )
  if (after) return after
  if (ticket.status !== 'closed') {
    throw conflict('Solo se puede calificar un tiquet cerrado')
  }
  const requester = await tx.execute(sql`
    select requester_id from public.tickets where id = ${input.ticketId}
  `)
  const requesterId = (requester.rows[0] as { requester_id: string })
    .requester_id
  await tx.execute(sql`
    insert into public.ticket_ratings (
      ticket_id, score, comment, rated_by, requester_id
    ) values (
      ${input.ticketId}, ${input.score}, ${input.comment}, ${actor.id}, ${requesterId}
    )
    on conflict (ticket_id) do update set
      score = excluded.score,
      comment = excluded.comment,
      rated_by = excluded.rated_by,
      updated_at = now()
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'rated',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { score: input.score, comment: input.comment },
  })
  return { ticketId: input.ticketId, action: 'rate', replayed: false }
}

export async function rateTicket(
  db: Database,
  actor: Actor,
  input: RateInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  if (
    !canAct(actor, 'ticket.rate', access) &&
    !canAct(actor, 'ticket.rate_on_behalf', access)
  ) {
    assertTicketAction(actor, 'ticket.rate', access)
  }
  return db.transaction((tx) => rateInTransaction(tx, actor, input))
}
