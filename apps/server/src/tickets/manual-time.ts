import { sql } from 'drizzle-orm'
import { z } from 'zod'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { writeEvent } from './events.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

const TIME_KINDS = [
  'supervisor_response',
  'reassignment',
  'technician_assignment',
  'recapture',
  'wait_start',
  'active_work',
  'pause',
  'validation',
  'claim',
  'duplicate_review',
] as const
const CLOCK_CLASSES = ['counted', 'not_counted'] as const

export const manualTimeSchema = z.object({
  kind: z.enum(TIME_KINDS),
  clockClass: z.enum(CLOCK_CLASSES),
  technicianId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  clientRequestId: z.string().uuid(),
})

export type ManualTimeInput = z.infer<typeof manualTimeSchema>

export type ManualTimeItem = {
  id: string
  kind: string
  startedAt: string
  endedAt: string | null
  clockClass: string
  voidedAt: string | null
  subjectTechnicianName: string | null
}

export async function listManualTime(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<ManualTimeItem[] | null> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return null
  const result = await db.execute(sql`
    select
      ts.id, ts.kind, ts.started_at, ts.ended_at, ts.clock_class,
      ts.voided_at, te.full_name as technician_name
    from public.time_spans ts
    left join public.technicians te on te.id = ts.subject_technician_id
    where ts.ticket_id = ${ticketId} and ts.origin = 'manual'
    order by ts.started_at desc, ts.id
  `)
  return (
    result.rows as Array<{
      id: string
      kind: string
      started_at: Date | string
      ended_at: Date | string | null
      clock_class: string
      voided_at: Date | string | null
      technician_name: string | null
    }>
  ).map((row) => ({
    id: row.id,
    kind: row.kind,
    startedAt: new Date(row.started_at).toISOString(),
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
    clockClass: row.clock_class,
    voidedAt: row.voided_at ? new Date(row.voided_at).toISOString() : null,
    subjectTechnicianName: row.technician_name,
  }))
}

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
    const inserted = await tx.execute(sql`
      insert into public.time_spans (
        ticket_id, cycle, kind, started_at, ended_at, clock_class, origin,
        recorded_by, client_request_id, subject_technician_id
      )
      select ${ticketId}, cycle, ${input.kind}::public.time_span_kind,
        ${input.startedAt}, ${input.endedAt}, ${input.clockClass}::public.clock_class,
        'manual', ${actor.id}, ${input.clientRequestId}, ${input.technicianId ?? null}
      from public.tickets where id = ${ticketId}
      returning id
    `)
    const spanId = (inserted.rows[0] as { id: string } | undefined)?.id
    if (!spanId) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
    await writeEvent(tx, {
      ticketId,
      type: 'manual_time_recorded',
      actorId: actor.id,
      clientRequestId: input.clientRequestId,
      payload: { spanId, kind: input.kind, clockClass: input.clockClass },
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
