import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import {
  assertValidatedRequesterCanAct,
  conflict,
  isFinalStatus,
  lockTicket,
  notFound,
  requireReason,
  validateHandled,
  type ActionResult,
  type LockedTicket,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import {
  actionTimestamp,
  endOpenParticipants,
  reopenLeaderParticipation,
  resolveOpenClaimOnDiscard,
} from './flow-state.js'
import { assertTicketHolder } from './access.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

type DiscardInput = {
  ticketId: string
  reasonId: string
  note: string | null
  clientRequestId: string
  permission: string
  reasonUse: string
  status: 'rejected' | 'cancelled'
  eventType: 'rejected' | 'cancelled'
  action: string
}

async function discardInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: DiscardInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    input.eventType,
    input.action,
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    input.eventType,
    input.action,
  )
  if (after) return after
  await assertValidatedRequesterCanAct(tx, actor, ticket, input.action)
  if (isFinalStatus(ticket.status)) {
    throw conflict('El tiquet ya está cerrado o descartado')
  }
  await requireReason(tx, input.reasonId, input.reasonUse, 'Motivo')
  await tx.execute(sql`
    update public.tickets
    set
      status = ${input.status},
      status_before_discard = ${ticket.status},
      closed_at = ${actionTimestamp()}
    where id = ${input.ticketId}
  `)
  await endOpenParticipants(tx, input.ticketId)
  await resolveOpenClaimOnDiscard(
    tx,
    input.ticketId,
    actor.id,
    'Tiquet descartado',
  )
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: input.eventType,
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectRequesterId: ticket.requester_id,
    payload: { note: input.note },
  })
  return {
    ticketId: input.ticketId,
    action: input.action,
    replayed: false,
  }
}

async function discard(
  db: Database,
  actor: Actor,
  input: DiscardInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, input.permission, access)
  assertTicketHolder(actor, access, input.permission)
  return db.transaction((tx) => discardInTransaction(tx, actor, input))
}

export type ReasonActionInput = {
  ticketId: string
  reasonId: string
  note: string | null
  clientRequestId: string
}

export function rejectTicket(
  db: Database,
  actor: Actor,
  input: ReasonActionInput,
) {
  return discard(db, actor, {
    ...input,
    permission: 'ticket.reject',
    reasonUse: 'rejection',
    status: 'rejected',
    eventType: 'rejected',
    action: 'reject',
  })
}

export function cancelTicket(
  db: Database,
  actor: Actor,
  input: ReasonActionInput,
) {
  return discard(db, actor, {
    ...input,
    permission: 'ticket.cancel',
    reasonUse: 'cancellation',
    status: 'cancelled',
    eventType: 'cancelled',
    action: 'cancel',
  })
}

export type ReactivateInput = {
  ticketId: string
  reasonId: string
  clientRequestId: string
}

type ReactivateContext = ReactivateInput & {
  ticket: LockedTicket & { status_before_discard: string | null }
}

async function reactivateInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: ReactivateContext,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticket.id,
    'reactivated',
    'reactivate',
  )
  if (before) return before
  await requireReason(tx, input.reasonId, 'reactivation', 'Motivo')
  if (!input.ticket.status_before_discard) {
    throw conflict('No hay estado previo al descarte')
  }
  await tx.execute(sql`
    update public.tickets
    set
      status = ${input.ticket.status_before_discard},
      status_before_discard = null,
      closed_at = null,
      duplicate_of_id = null
    where id = ${input.ticket.id}
  `)
  if (
    ['assigned', 'in_progress', 'paused'].includes(
      input.ticket.status_before_discard,
    )
  ) {
    await reopenLeaderParticipation(tx, input.ticket.id, actor.id)
  }
  await writeEvent(tx, {
    ticketId: input.ticket.id,
    type: 'reactivated',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    payload: { to: input.ticket.status_before_discard },
  })
  return {
    ticketId: input.ticket.id,
    action: 'reactivate',
    replayed: false,
  }
}

export async function reactivateTicket(
  db: Database,
  actor: Actor,
  input: ReactivateInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.reactivate', access)
  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      select id, status, cycle, category_id, status_before_discard
      from public.tickets where id = ${input.ticketId} for update
    `)
    const ticket = locked.rows[0] as
      (LockedTicket & { status_before_discard: string | null }) | undefined
    if (!ticket) throw notFound()
    if (!['rejected', 'cancelled', 'duplicate'].includes(ticket.status)) {
      throw conflict('El tiquet no está descartado')
    }
    return reactivateInTransaction(tx, actor, { ...input, ticket })
  })
}
