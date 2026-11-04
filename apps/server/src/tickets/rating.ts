import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertRequesterProxy } from './proxy.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'
import type { TicketAccess } from './access.js'

export type RateInput = {
  ticketId: string
  score: number
  comment: string | null
  clientRequestId: string
  subjectRequesterId?: string | null
}

async function hasRequesterValidation(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
): Promise<boolean> {
  const result = await tx.execute(sql`
    select exists (
      select 1 from public.ticket_validations
      where ticket_id = ${ticketId} and cycle = ${cycle}
        and validator_role = 'requester'
    ) as requester_validated
  `)
  return Boolean(
    (result.rows[0] as { requester_validated: boolean } | undefined)
      ?.requester_validated,
  )
}

async function insertRating(
  tx: DbExecutor,
  actor: Actor,
  input: RateInput,
): Promise<string> {
  const requester = await tx.execute(sql`
    select requester_id from public.tickets where id = ${input.ticketId}
  `)
  const requesterId = (requester.rows[0] as { requester_id: string })
    .requester_id
  const inserted = await tx.execute(sql`
    insert into public.ticket_ratings (
      ticket_id, score, comment, rated_by, requester_id
    ) values (
      ${input.ticketId}, ${input.score}, ${input.comment}, ${actor.id}, ${requesterId}
    )
    on conflict (ticket_id) do nothing
    returning id
  `)
  if (!inserted.rows[0]) {
    throw conflict('El tiquet ya tiene una calificación')
  }
  return requesterId
}

async function rateInTransaction(
  tx: DbExecutor,
  actor: Actor,
  access: TicketAccess,
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
  assertRequesterProxy({
    actor,
    access,
    requesterId: ticket.requester_id,
    subjectRequesterId: input.subjectRequesterId,
    permission: 'ticket.rate_on_behalf',
  })
  const requesterValidated = await hasRequesterValidation(
    tx,
    input.ticketId,
    ticket.cycle,
  )
  if (
    ticket.status !== 'closed' &&
    !(ticket.status === 'attended' && requesterValidated)
  ) {
    throw conflict(
      'Solo se puede calificar un tiquet cerrado o validado por el solicitante',
    )
  }
  const requesterId = await insertRating(tx, actor, input)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'rated',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    subjectRequesterId: requesterId,
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
  if (input.subjectRequesterId) {
    assertTicketAction(actor, 'ticket.rate_on_behalf', access)
  } else {
    if (access.requesterUserId !== actor.id) {
      throw new AppError(
        403,
        'forbidden',
        'Solo el solicitante puede calificar; actúa a su nombre',
      )
    }
    assertTicketAction(actor, 'ticket.rate', access)
  }
  return db.transaction((tx) => rateInTransaction(tx, actor, access, input))
}
