import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'
import { writeEvent } from './events.js'
import type { ManualTimeInput } from './manual-time-schema.js'
import {
  assertNoOverlap,
  correctionTarget,
  validateWindow,
  type TicketClock,
} from './manual-time-validation.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

export { manualTimeContext } from './manual-time-context.js'
export { manualTimeSchema } from './manual-time-schema.js'
export type { ManualTimeInput } from './manual-time-schema.js'

async function lockTicket(
  tx: DbExecutor,
  ticketId: string,
): Promise<TicketClock> {
  const result = await tx.execute(sql`
    select reported_at, closed_at, cycle, status
    from public.tickets where id = ${ticketId}
    for update
  `)
  const ticket = result.rows[0] as TicketClock | undefined
  if (!ticket) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  return ticket
}

async function markReplaced(
  tx: DbExecutor,
  ticketId: string,
  targetId: string,
  actorId: string,
): Promise<void> {
  const voided = await tx.execute(sql`
    update public.time_spans
    set voided_at = now(), voided_by = ${actorId}
    where id = ${targetId} and ticket_id = ${ticketId}
      and voided_at is null
    returning id
  `)
  if (!voided.rows[0]) {
    throw new AppError(409, 'conflict', 'El tramo ya fue corregido')
  }
}

type InsertSpanInput = {
  ticketId: string
  ticket: TicketClock
  input: ManualTimeInput
  start: Date
  end: Date | null
  targetId: string | null
  actorId: string
}

async function insertManualSpan(
  tx: DbExecutor,
  { ticketId, ticket, input, start, end, targetId, actorId }: InsertSpanInput,
): Promise<string> {
  const inserted = await tx.execute(sql`
    insert into public.time_spans (
      ticket_id, cycle, kind, started_at, ended_at, clock_class, origin,
      recorded_by, client_request_id, subject_technician_id,
      replaces_span_id
    ) values (
      ${ticketId}, ${ticket.cycle}, ${input.kind}::public.time_span_kind,
      ${start}, ${end}, ${input.clockClass}::public.clock_class, 'manual',
      ${actorId}, ${input.clientRequestId}, ${input.technicianId ?? null},
      ${targetId}
    )
    returning id
  `)
  const spanId = (inserted.rows[0] as { id: string } | undefined)?.id
  if (!spanId) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  return spanId
}

/** Alta de un tramo manual o corrección de uno existente. */
export async function recordManualTime(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: ManualTimeInput,
): Promise<void> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  assertTicketAction(actor, 'time.record_manual', access)

  await db.transaction(async (tx) => {
    const existing = await tx.execute(sql`
      select id from public.time_spans where client_request_id = ${input.clientRequestId}
    `)
    if (existing.rows[0]) return
    const ticket = await lockTicket(tx, ticketId)
    const { start, end } = await validateWindow(tx, ticketId, ticket, input)
    const targetId = await correctionTarget(tx, ticketId, input)
    await assertNoOverlap(tx, {
      ticketId,
      input,
      start,
      end,
      targetId,
    })
    if (targetId) await markReplaced(tx, ticketId, targetId, actor.id)
    const spanId = await insertManualSpan(tx, {
      ticketId,
      ticket,
      input,
      start,
      end,
      targetId,
      actorId: actor.id,
    })
    await writeEvent(tx, {
      ticketId,
      type: 'manual_time_recorded',
      actorId: actor.id,
      clientRequestId: input.clientRequestId,
      payload: {
        spanId,
        kind: input.kind,
        clockClass: input.clockClass,
        replacesSpanId: targetId,
      },
    })
  })
}

export async function voidManualTime(
  db: Database,
  actor: Actor,
  ticketId: string,
  spanId: string,
): Promise<void> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  assertTicketAction(actor, 'time.record_manual', access)
  await db.transaction(async (tx) => {
    const updated = await tx.execute(sql`
      update public.time_spans
      set voided_at = now(), voided_by = ${actor.id}
      where id = ${spanId} and ticket_id = ${ticketId}
        and origin = 'manual' and voided_at is null
      returning id
    `)
    if (!updated.rows[0]) {
      throw new AppError(
        409,
        'conflict',
        'El tramo manual ya no se puede anular',
      )
    }
    await writeEvent(tx, {
      ticketId,
      type: 'manual_time_recorded',
      actorId: actor.id,
      payload: { spanId, voided: true },
    })
  })
}
