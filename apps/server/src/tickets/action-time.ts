import { sql } from 'drizzle-orm'
import { z } from 'zod'

import type { Actor } from '../auth/authorization.js'
import { can } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'
import { withOccurredAt } from './event-context.js'
import { writeEvent } from './events.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

const TOLERANCE_MS = 60_000

export const eventTimeSchema = z.object({
  occurredAt: z.string().datetime(),
})

type TicketClock = {
  reported_at: Date | string
  closed_at: Date | string | null
  cycle: number
  status: string
}

type EventRow = {
  id: number
  cycle: number
  type: string
  occurred_at: Date | string
}

type ActionTimeInput = {
  db: Database
  actor: Actor
  ticketId: string
  occurredAt: string
  subjectTechnicianId?: string | null
}

type AdjustInput = {
  ticketId: string
  eventId: number
  occurredAt: string
}

export function parseActionTime(value: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'validation', 'La hora no es válida')
  }
  if (date.getTime() > Date.now() + TOLERANCE_MS) {
    throw new AppError(400, 'validation', 'La hora no puede estar en el futuro')
  }
  return date
}

function assertTimePermission(actor: Actor): void {
  if (!can(actor, 'time.record_manual')) {
    throw new AppError(
      403,
      'forbidden',
      'No tienes permiso para ajustar la hora de las acciones',
    )
  }
}

async function ticketClock(
  db: DbExecutor,
  ticketId: string,
  lock = false,
): Promise<TicketClock> {
  const result = await db.execute(sql`
    select reported_at, closed_at, cycle, status
    from public.tickets where id = ${ticketId}
    ${lock ? sql`for update` : sql``}
  `)
  const ticket = result.rows[0] as TicketClock | undefined
  if (!ticket) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  return ticket
}

async function lastActionTime(
  db: DbExecutor,
  ticketId: string,
  cycle: number,
): Promise<Date | null> {
  const result = await db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId}
      and cycle = ${cycle}
      and type <> 'event_time_corrected'
    order by occurred_at desc, id desc
    limit 1
  `)
  const value = (result.rows[0] as { occurred_at: Date | string } | undefined)
    ?.occurred_at
  return value ? new Date(value) : null
}

/** Valida que el actor pueda fijar la hora de una acción por proxy. */
export async function validateManualActionTime({
  db,
  actor,
  ticketId,
  occurredAt,
  subjectTechnicianId,
}: ActionTimeInput): Promise<Date> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  assertTicketAction(actor, 'time.record_manual', access)
  if (!subjectTechnicianId) {
    throw new AppError(
      400,
      'validation',
      'Solo puedes fijar la hora al actuar a nombre de un técnico',
    )
  }
  const proposed = parseActionTime(occurredAt)
  const ticket = await ticketClock(db, ticketId)
  const previous = await lastActionTime(db, ticketId, ticket.cycle)
  if (proposed < new Date(ticket.reported_at)) {
    throw new AppError(
      400,
      'validation',
      'La acción no puede ser anterior al registro del tiquet',
    )
  }
  if (previous && proposed < previous) {
    throw new AppError(
      409,
      'conflict',
      'La acción no puede ser anterior a la acción previa',
    )
  }
  return proposed
}

/** Ejecuta una acción con una hora distinta a la del servidor si está permitido. */
export async function withActionTime<T>(
  input: ActionTimeInput,
  callback: () => Promise<T>,
): Promise<T> {
  if (!input.occurredAt) return callback()
  const proposed = await validateManualActionTime(input)
  return withOccurredAt(proposed.toISOString(), callback)
}

/** Valida una hora explícita al crear un tiquet. */
export function assertCreateTime(actor: Actor, occurredAt: string | undefined) {
  if (!occurredAt) return
  assertTimePermission(actor)
  parseActionTime(occurredAt)
}

async function eventRow(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
): Promise<EventRow> {
  const result = await tx.execute(sql`
    select id, cycle, type, occurred_at
    from public.ticket_events
    where id = ${eventId} and ticket_id = ${ticketId}
  `)
  const event = result.rows[0] as EventRow | undefined
  if (!event) throw new AppError(404, 'not_found', 'Evento no encontrado')
  if (event.type === 'event_time_corrected') {
    throw new AppError(
      400,
      'validation',
      'No se puede corregir un evento de auditoría',
    )
  }
  return event
}

async function assertNeighbourTime(
  tx: DbExecutor,
  ticketId: string,
  event: EventRow,
  proposed: Date,
): Promise<void> {
  const result = await tx.execute(sql`
    select
      max(occurred_at) filter (where occurred_at < ${proposed.toISOString()}::timestamptz) as previous,
      min(occurred_at) filter (where occurred_at > ${proposed.toISOString()}::timestamptz) as next
    from public.ticket_events
    where ticket_id = ${ticketId}
      and cycle = ${event.cycle}
      and id <> ${event.id}
      and type <> 'event_time_corrected'
  `)
  const bounds = result.rows[0] as
    { previous: Date | string | null; next: Date | string | null } | undefined
  if (bounds?.previous && proposed < new Date(bounds.previous)) {
    throw new AppError(
      409,
      'conflict',
      'La hora queda antes del evento anterior',
    )
  }
  if (bounds?.next && proposed > new Date(bounds.next)) {
    throw new AppError(
      409,
      'conflict',
      'La hora queda después del evento siguiente',
    )
  }
}

async function applyAdjustment(
  tx: DbExecutor,
  {
    actor,
    ticketId,
    event,
    proposed,
  }: {
    actor: Actor
    ticketId: string
    event: EventRow
    proposed: Date
  },
): Promise<void> {
  const previous = new Date(event.occurred_at)
  await tx.execute(sql`
    update public.ticket_events
    set occurred_at = ${proposed}
    where id = ${event.id} and ticket_id = ${ticketId}
  `)
  if (event.type === 'created') {
    await tx.execute(sql`
      update public.tickets set reported_at = ${proposed}
      where id = ${ticketId}
    `)
  }
  await writeEvent(tx, {
    ticketId,
    type: 'event_time_corrected',
    actorId: actor.id,
    payload: {
      eventId: event.id,
      previousOccurredAt: previous.toISOString(),
      occurredAt: proposed.toISOString(),
      eventType: event.type,
    },
  })
  await tx.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
}

async function adjustInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: AdjustInput,
): Promise<void> {
  const ticket = await ticketClock(tx, input.ticketId, true)
  const event = await eventRow(tx, input.ticketId, input.eventId)
  const proposed = parseActionTime(input.occurredAt)
  if (proposed < new Date(ticket.reported_at)) {
    throw new AppError(
      400,
      'validation',
      'La acción no puede ser anterior al registro del tiquet',
    )
  }
  await assertNeighbourTime(tx, input.ticketId, event, proposed)
  await applyAdjustment(tx, {
    actor,
    ticketId: input.ticketId,
    event,
    proposed,
  })
}

/** Corrige la hora de un evento y reconstruye sus tramos. */
export async function adjustEventTime(
  db: Database,
  actor: Actor,
  input: AdjustInput,
): Promise<void> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  assertTicketAction(actor, 'time.record_manual', access)
  await db.transaction((tx) => adjustInTransaction(tx, actor, input))
}
