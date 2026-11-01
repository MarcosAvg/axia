import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  isFinalStatus,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
  type LockedTicket,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { linkCandidate } from './duplicates.js'
import { findHandledEvent, writeEvent } from './events.js'
import {
  actionTimestamp,
  endOpenParticipants,
  resolveOpenClaimOnDiscard,
} from './flow-state.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'
import { scopePredicate } from './scope.js'

export type MarkDuplicateInput = {
  ticketId: string
  originalId: string
  clientRequestId: string
}

async function assertLinkableOriginal(
  tx: DbExecutor,
  actor: Actor,
  ticketId: string,
  originalId: string,
) {
  const original = await tx.execute(sql`
    select t.id, t.status
    from public.tickets t
    join public.requesters r on r.id = t.requester_id
    where t.id = ${originalId}
      and (
        ${scopePredicate(actor, 'ticket.view')}
        or exists (
          select 1
          from public.ticket_duplicate_candidates c
          where c.ticket_id = ${ticketId} and c.candidate_ticket_id = t.id
        )
      )
    limit 1
  `)
  const row = original.rows[0] as { id: string; status: string } | undefined
  if (!row) throw notFound()
  if (row.status === 'duplicate') {
    throw conflict(
      'El tiquet original ya es un duplicado; enlaza al original de ese tiquet',
    )
  }
  const cycle = await tx.execute(sql`
    with recursive chain as (
      select id, duplicate_of_id, 1 as depth
      from public.tickets
      where id = ${originalId}
      union all
      select t.id, t.duplicate_of_id, chain.depth + 1
      from public.tickets t
      join chain on t.id = chain.duplicate_of_id
      where chain.depth < 20
    )
    select 1 from chain where id = ${ticketId} limit 1
  `)
  if (cycle.rows[0]) {
    throw conflict('El enlace crearía un ciclo entre duplicados')
  }
}

async function dismissReciprocalCandidates(
  tx: DbExecutor,
  ticketId: string,
  actorId: string,
) {
  const affected = await tx.execute(sql`
    update public.ticket_duplicate_candidates
    set decision = 'dismissed', decided_by = ${actorId}, decided_at = now()
    where candidate_ticket_id = ${ticketId} and decision is null
    returning ticket_id
  `)
  const affectedIds = affected.rows.map(
    (row) => (row as { ticket_id: string }).ticket_id,
  )
  if (affectedIds.length === 0) return
  await tx.execute(sql`
    update public.tickets t
    set possible_duplicate = exists (
      select 1 from public.ticket_duplicate_candidates c
      where c.ticket_id = t.id
    )
    where t.id = any(string_to_array(${affectedIds.join(',')}, ',')::uuid[])
  `)
}

async function applyDuplicate(
  tx: DbExecutor,
  actor: Actor,
  input: MarkDuplicateInput,
  ticket: LockedTicket,
) {
  if (input.ticketId === input.originalId) {
    throw new AppError(
      400,
      'validation_error',
      'Un tiquet no puede ser duplicado de sí mismo',
    )
  }
  await assertLinkableOriginal(tx, actor, input.ticketId, input.originalId)
  await tx.execute(sql`
    insert into public.ticket_links (ticket_id, linked_ticket_id, link_type, created_by)
    values (${input.ticketId}, ${input.originalId}, 'duplicate_of', ${actor.id})
    on conflict do nothing
  `)
  await tx.execute(sql`
    update public.tickets
    set
      status = 'duplicate',
      status_before_discard = ${ticket.status},
      duplicate_of_id = ${input.originalId},
      possible_duplicate = false,
      closed_at = ${actionTimestamp()}
    where id = ${input.ticketId}
  `)
  await linkCandidate(tx, input.ticketId, actor.id, input.originalId)
  await dismissReciprocalCandidates(tx, input.ticketId, actor.id)
  await endOpenParticipants(tx, input.ticketId)
  await resolveOpenClaimOnDiscard(
    tx,
    input.ticketId,
    actor.id,
    'Tiquet marcado como duplicado',
  )
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'duplicate_marked',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { duplicateOf: input.originalId },
  })
}

async function markDuplicateInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: MarkDuplicateInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'duplicate_marked',
    'mark_duplicate',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'duplicate_marked',
    'mark_duplicate',
  )
  if (after) return after
  if (isFinalStatus(ticket.status)) {
    throw conflict('El tiquet ya está cerrado o descartado')
  }
  await applyDuplicate(tx, actor, input, ticket)
  return {
    ticketId: input.ticketId,
    action: 'mark_duplicate',
    replayed: false,
  }
}

export async function markDuplicate(
  db: Database,
  actor: Actor,
  input: MarkDuplicateInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.mark_duplicate', access)
  return db.transaction((tx) => markDuplicateInTransaction(tx, actor, input))
}
