import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import {
  conflict,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { requirePauseDescendant, requirePauseRoot } from './reasons.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

type PauseInput = {
  ticketId: string
  reasonId: string
  note: string | null
  estimatedDate: string | null
  clientRequestId: string
}

type PauseRow = {
  id: string
  root_reason_id: string
}

async function openPause(tx: DbExecutor, ticketId: string): Promise<PauseRow> {
  const result = await tx.execute(sql`
    select id, root_reason_id
    from public.ticket_pauses
    where ticket_id = ${ticketId} and closed_at is null
    order by opened_at desc
    limit 1
    for update
  `)
  const row = result.rows[0] as PauseRow | undefined
  if (!row) throw conflict('El tiquet no tiene una pausa abierta')
  return row
}

async function pauseInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: PauseInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'paused',
    'pause',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'paused',
    'pause',
  )
  if (after) return after
  if (ticket.status !== 'in_progress') {
    throw conflict('El tiquet no está en proceso')
  }
  await requirePauseRoot(tx, input.reasonId)

  const inserted = await tx.execute(sql`
    insert into public.ticket_pauses (
      ticket_id, cycle, reason_id, opened_by, note, estimated_date,
      recorded_by, client_request_id, root_reason_id
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${input.reasonId}, ${actor.id},
      ${input.note}, ${input.estimatedDate}, ${actor.id},
      ${input.clientRequestId}, ${input.reasonId}
    )
    returning id
  `)
  const pauseId = (inserted.rows[0] as { id: string }).id
  await tx.execute(sql`
    insert into public.ticket_pause_steps (pause_id, reason_id, actor_id, note)
    values (${pauseId}, ${input.reasonId}, ${actor.id}, ${input.note})
  `)
  await tx.execute(sql`
    update public.tickets set status = 'paused' where id = ${input.ticketId}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'paused',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    payload: { note: input.note, estimatedDate: input.estimatedDate },
  })
  return { ticketId: input.ticketId, action: 'pause', replayed: false }
}

export async function pauseTicket(
  db: Database,
  actor: Actor,
  input: PauseInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.pause', access)
  return db.transaction((tx) => pauseInTransaction(tx, actor, input))
}

type AdvancePauseInput = {
  ticketId: string
  reasonId: string
  note: string | null
  clientRequestId: string
}

async function advanceInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: AdvancePauseInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'pause_advanced',
    'advance_pause',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'pause_advanced',
    'advance_pause',
  )
  if (after) return after
  if (ticket.status !== 'paused') {
    throw conflict('El tiquet no está pausado')
  }
  const pause = await openPause(tx, input.ticketId)
  await requirePauseDescendant(tx, pause.root_reason_id, input.reasonId)
  await tx.execute(sql`
    update public.ticket_pause_steps
    set exited_at = now()
    where pause_id = ${pause.id} and exited_at is null
  `)
  await tx.execute(sql`
    insert into public.ticket_pause_steps (pause_id, reason_id, actor_id, note)
    values (${pause.id}, ${input.reasonId}, ${actor.id}, ${input.note})
  `)
  await tx.execute(sql`
    update public.ticket_pauses
    set reason_id = ${input.reasonId}
    where id = ${pause.id}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'pause_advanced',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    payload: { note: input.note },
  })
  return { ticketId: input.ticketId, action: 'advance_pause', replayed: false }
}

export async function advancePause(
  db: Database,
  actor: Actor,
  input: AdvancePauseInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.pause', access)
  return db.transaction((tx) => advanceInTransaction(tx, actor, input))
}

type ResumeInput = {
  ticketId: string
  reasonId: string
  clientRequestId: string
}

async function resumeInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: ResumeInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'resumed',
    'resume',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'resumed',
    'resume',
  )
  if (after) return after
  if (ticket.status !== 'paused') {
    throw conflict('El tiquet no está pausado')
  }
  const pause = await openPause(tx, input.ticketId)
  await requirePauseDescendant(tx, pause.root_reason_id, input.reasonId)
  await tx.execute(sql`
    update public.ticket_pause_steps
    set exited_at = now()
    where pause_id = ${pause.id} and exited_at is null
  `)
  await tx.execute(sql`
    update public.ticket_pauses set closed_at = now() where id = ${pause.id}
  `)
  await tx.execute(sql`
    update public.tickets set status = 'in_progress' where id = ${input.ticketId}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'resumed',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
  })
  return { ticketId: input.ticketId, action: 'resume', replayed: false }
}

export async function resumeTicket(
  db: Database,
  actor: Actor,
  input: ResumeInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.resume', access)
  return db.transaction((tx) => resumeInTransaction(tx, actor, input))
}
