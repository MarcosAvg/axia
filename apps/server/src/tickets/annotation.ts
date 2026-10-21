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
import { assertTicketAction, findVisibleTicket } from './repository.js'

type CommentInput = {
  ticketId: string
  text: string
  isInternal: boolean
  clientRequestId: string
}

async function commentInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: CommentInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'comment',
    'comment',
  )
  if (before) return before
  await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'comment',
    'comment',
  )
  if (after) return after
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'comment',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { text: input.text, isInternal: input.isInternal },
  })
  return { ticketId: input.ticketId, action: 'comment', replayed: false }
}

export async function commentTicket(
  db: Database,
  actor: Actor,
  input: CommentInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.view', access)
  return db.transaction((tx) => commentInTransaction(tx, actor, input))
}

type PriorityInput = {
  ticketId: string
  priorityId: string
  clientRequestId: string
}

async function priorityInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: PriorityInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'priority_changed',
    'change_priority',
  )
  if (before) return before
  await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'priority_changed',
    'change_priority',
  )
  if (after) return after
  const priority = await tx.execute(sql`
    select id from public.priorities
    where id = ${input.priorityId} and active
    limit 1
  `)
  if (!priority.rows[0]) {
    throw new AppError(400, 'validation_error', 'Prioridad no válida')
  }
  const previous = await tx.execute(sql`
    select priority_id from public.tickets where id = ${input.ticketId}
  `)
  const from = (previous.rows[0] as { priority_id: string }).priority_id
  if (from === input.priorityId) {
    throw conflict('El tiquet ya tiene esa prioridad')
  }
  await tx.execute(sql`
    update public.tickets
    set priority_id = ${input.priorityId}
    where id = ${input.ticketId}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'priority_changed',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { from, to: input.priorityId },
  })
  return {
    ticketId: input.ticketId,
    action: 'change_priority',
    replayed: false,
  }
}

export async function changePriority(
  db: Database,
  actor: Actor,
  input: PriorityInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.prioritize', access)
  return db.transaction((tx) => priorityInTransaction(tx, actor, input))
}
