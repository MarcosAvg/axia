import { sql } from 'drizzle-orm'
import { z } from 'zod'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'
import {
  assertTimePermission,
  lastActionTime,
  parseActionTime,
  serverNow,
  ticketClock,
  TOLERANCE_MS,
} from './action-time-support.js'
import { withActionContext } from './event-context.js'
import { writeEvent } from './events.js'
import { INSTANCE_WALL_CLOCK, parseInstanceWallClock } from './instance-time.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

export { parseActionTime } from './action-time-support.js'

export const eventTimeSchema = z
  .object({
    occurredLocal: z.string().regex(INSTANCE_WALL_CLOCK).optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .refine((value) => Boolean(value.occurredLocal || value.occurredAt), {
    message: 'Indica la hora de la acción',
  })

type EventRow = {
  id: number
  cycle: number
  type: string
  occurred_at: Date | string
  time_confidence: string
}

type ActionTimeInput = {
  db: Database
  actor: Actor
  ticketId: string
  occurredLocal?: string | null
  occurredAt?: string | null
  subjectTechnicianId?: string | null
  clientReportedAt?: string | null
  clientClockSkewMs?: number | null
}

type AdjustInput = {
  ticketId: string
  eventId: number
  occurredLocal?: string | null
  occurredAt?: string | null
}

/** Valida que el actor pueda fijar la hora de una acción por proxy. */
export async function validateManualActionTime({
  db,
  actor,
  ticketId,
  occurredLocal,
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
  const proposed = occurredLocal
    ? await parseInstanceWallClock(db, occurredLocal)
    : parseActionTime(occurredAt ?? '')
  const now = await serverNow(db)
  if (proposed.getTime() > now.getTime() + TOLERANCE_MS) {
    throw new AppError(400, 'validation', 'La hora no puede estar en el futuro')
  }
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
  if (!input.occurredLocal && !input.occurredAt) {
    return withActionContext(
      {
        occurredAt: null,
        clientReportedAt: input.clientReportedAt ?? null,
        timeConfidence: 'trusted',
        clientClockSkewMs: input.clientClockSkewMs ?? null,
        timeAlertKind: null,
        suggestedOccurredAt: null,
      },
      callback,
    )
  }
  const proposed = await validateManualActionTime(input)
  return withActionContext(
    {
      occurredAt: proposed.toISOString(),
      clientReportedAt: input.clientReportedAt ?? null,
      timeConfidence: 'corrected',
      clientClockSkewMs: input.clientClockSkewMs ?? null,
      timeAlertKind: null,
      suggestedOccurredAt: null,
    },
    callback,
  )
}

/** Valida una hora explícita al crear un tiquet. */
export async function assertCreateTime(
  db: DbExecutor,
  actor: Actor,
  occurredLocal: string | undefined,
  occurredAt: string | undefined,
): Promise<void> {
  if (!occurredLocal && !occurredAt) return
  assertTimePermission(actor)
  const proposed = occurredLocal
    ? await parseInstanceWallClock(db, occurredLocal)
    : parseActionTime(occurredAt ?? '')
  const now = await serverNow(db)
  if (proposed.getTime() > now.getTime() + TOLERANCE_MS) {
    throw new AppError(400, 'validation', 'La hora no puede estar en el futuro')
  }
}

async function eventRow(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
): Promise<EventRow> {
  const result = await tx.execute(sql`
    select id, cycle, type, occurred_at, time_confidence
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
  const current = new Date(event.occurred_at)
  const result = await tx.execute(sql`
    select
      max(occurred_at) filter (where occurred_at < ${current}::timestamptz) as previous,
      min(occurred_at) filter (where occurred_at > ${current}::timestamptz) as next
    from public.ticket_events
    where ticket_id = ${ticketId}
      and cycle = ${event.cycle}
      and id <> ${event.id}
      and type not in ('event_time_corrected', 'time_alert')
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
    set occurred_at = ${proposed}, time_confidence = 'corrected'
    where id = ${event.id} and ticket_id = ${ticketId}
  `)
  await tx.execute(sql`
    update public.ticket_time_alerts
    set status = 'resolved',
        resolved_by = ${actor.id},
        resolved_at = now(),
        note = 'Hora corregida manualmente'
    where event_id = ${event.id} and status = 'open'
  `)
  if (event.type === 'created') {
    await tx.execute(sql`
      update public.tickets set reported_at = ${proposed}
      where id = ${ticketId}
    `)
  }
  await tx.execute(sql`select public.recompute_ticket_closed_at(${ticketId})`)
  await writeEvent(tx, {
    ticketId,
    type: 'event_time_corrected',
    actorId: actor.id,
    payload: {
      eventId: event.id,
      previousOccurredAt: previous.toISOString(),
      occurredAt: proposed.toISOString(),
      eventType: event.type,
      previousTimeConfidence: event.time_confidence,
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
  const proposed = input.occurredLocal
    ? await parseInstanceWallClock(tx, input.occurredLocal)
    : parseActionTime(input.occurredAt ?? '')
  const now = await serverNow(tx)
  if (proposed.getTime() > now.getTime() + TOLERANCE_MS) {
    throw new AppError(400, 'validation', 'La hora no puede estar en el futuro')
  }
  // El alta define el límite inferior; corregirla mueve ese límite.
  if (event.type !== 'created' && proposed < new Date(ticket.reported_at)) {
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
