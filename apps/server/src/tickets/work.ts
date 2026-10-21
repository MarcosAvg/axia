import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  hasEvidence,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

async function startInTransaction(
  tx: DbExecutor,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'started',
    'start',
  )
  if (before) return before
  const ticket = await lockTicket(tx, ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'started',
    'start',
  )
  if (after) return after
  if (ticket.status !== 'assigned') {
    throw conflict('El tiquet no está asignado')
  }
  if (!(await hasEvidence(tx, ticketId, ticket.cycle, 'before'))) {
    throw conflict('Falta la evidencia "before" del ciclo')
  }
  await tx.execute(sql`
    update public.tickets set status = 'in_progress' where id = ${ticketId}
  `)
  await writeEvent(tx, {
    ticketId,
    type: 'started',
    actorId: actor.id,
    clientRequestId,
  })
  return { ticketId, action: 'start', replayed: false }
}

export async function startTicket(
  db: Database,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.start', access)
  return db.transaction((tx) =>
    startInTransaction(tx, actor, ticketId, clientRequestId),
  )
}

type AttendInput = {
  ticketId: string
  workDescription: string
  serviceTypeId?: string
  clientRequestId: string
}

async function validateServiceType(tx: DbExecutor, serviceTypeId: string) {
  const result = await tx.execute(sql`
    select id from public.service_types
    where id = ${serviceTypeId} and active
    limit 1
  `)
  if (!result.rows[0]) {
    throw new AppError(400, 'validation_error', 'Tipo de servicio no válido')
  }
}

async function attendInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: AttendInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'attended',
    'attend',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'attended',
    'attend',
  )
  if (after) return after
  if (ticket.status !== 'in_progress') {
    throw conflict('El tiquet no está en proceso')
  }
  if (!(await hasEvidence(tx, input.ticketId, ticket.cycle, 'after'))) {
    throw conflict('Falta la evidencia "after" del ciclo')
  }
  if (input.serviceTypeId) await validateServiceType(tx, input.serviceTypeId)
  await tx.execute(sql`
    update public.tickets
    set
      status = 'attended',
      service_type_id = coalesce(${input.serviceTypeId ?? null}, service_type_id)
    where id = ${input.ticketId}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'attended',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { workDescription: input.workDescription },
  })
  return {
    ticketId: input.ticketId,
    action: 'attend',
    replayed: false,
  }
}

export async function attendTicket(
  db: Database,
  actor: Actor,
  input: AttendInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.attend', access)
  return db.transaction((tx) => attendInTransaction(tx, actor, input))
}
