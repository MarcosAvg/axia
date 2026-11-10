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
  endTechnicianAssignments,
  reopenLeaderParticipation,
  resolveOpenClaimOnDiscard,
} from './flow-state.js'
import { assertTicketHolder, type TicketAccess } from './access.js'
import { assertRequesterProxy } from './proxy.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'
import { assertTimeVerified } from './time-alerts.js'

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
  subjectRequesterId?: string | null
}

async function applyDiscard(
  tx: DbExecutor,
  context: {
    actor: Actor
    access: TicketAccess
    ticket: LockedTicket
    input: DiscardInput
    onBehalf: boolean
  },
): Promise<void> {
  const { actor, access, ticket, input, onBehalf } = context
  await tx.execute(sql`
    update public.tickets
    set
      status = ${input.status},
      status_before_discard = ${ticket.status},
      closed_at = ${actionTimestamp()}
    where id = ${input.ticketId}
  `)
  await endOpenParticipants(tx, input.ticketId)
  await endTechnicianAssignments(tx, input.ticketId)
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
    ...(onBehalf || access.requesterUserId === actor.id
      ? { subjectRequesterId: ticket.requester_id }
      : { subjectUserId: actor.id }),
    payload: { note: input.note },
  })
}

async function discardInTransaction(
  tx: DbExecutor,
  actor: Actor,
  access: TicketAccess,
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
  const onBehalf = assertRequesterProxy({
    actor,
    access,
    requesterId: ticket.requester_id,
    subjectRequesterId: input.subjectRequesterId,
    permission: 'ticket.cancel_on_behalf',
  })
  await assertValidatedRequesterCanAct(tx, actor, ticket, input.action)
  if (isFinalStatus(ticket.status)) {
    throw conflict('El tiquet ya está cerrado o descartado')
  }
  await assertTimeVerified(tx, input.ticketId)
  await requireReason(tx, input.reasonId, input.reasonUse, 'Motivo')
  await applyDiscard(tx, { actor, access, ticket, input, onBehalf })
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
  return db.transaction((tx) => discardInTransaction(tx, actor, access, input))
}

export type ReasonActionInput = {
  ticketId: string
  reasonId: string
  note: string | null
  clientRequestId: string
  subjectRequesterId?: string | null
}

export function rejectTicket(
  db: Database,
  actor: Actor,
  input: ReasonActionInput,
) {
  return discard(db, actor, {
    ...input,
    subjectRequesterId: null,
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
    permission: input.subjectRequesterId
      ? 'ticket.cancel_on_behalf'
      : 'ticket.cancel',
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
