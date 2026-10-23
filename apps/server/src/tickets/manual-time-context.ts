import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { findVisibleTicket } from './repository.js'

type ManualTimeItem = {
  id: string
  kind: string
  startedAt: string
  endedAt: string | null
  clockClass: string
  voidedAt: string | null
  subjectTechnicianName: string | null
  replacesSpanId: string | null
}

type CurrentTimeSpan = {
  id: string
  kind: string
  startedAt: string
  endedAt: string | null
  clockClass: string
  origin: string
  subjectTechnicianId: string | null
  subjectTechnicianName: string | null
}

type ManualTimeContext = {
  status: string
  current: CurrentTimeSpan | null
  defaultTechnicianId: string | null
  defaultTechnicianName: string | null
}

type ManualTimeRow = {
  id: string
  kind: string
  started_at: Date | string
  ended_at: Date | string | null
  clock_class: string
  voided_at: Date | string | null
  technician_name: string | null
  replaces_span_id: string | null
}

function iso(value: Date | string | null): string | null {
  return value === null ? null : new Date(value).toISOString()
}

async function manualTimeRows(
  db: Database,
  ticketId: string,
): Promise<ManualTimeItem[]> {
  const result = await db.execute(sql`
    select
      ts.id, ts.kind, ts.started_at, ts.ended_at, ts.clock_class,
      ts.voided_at, ts.replaces_span_id, te.full_name as technician_name
    from public.time_spans ts
    left join public.technicians te on te.id = ts.subject_technician_id
    where ts.ticket_id = ${ticketId} and ts.origin = 'manual'
    order by ts.started_at desc, ts.id
  `)
  return (result.rows as ManualTimeRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    startedAt: new Date(row.started_at).toISOString(),
    endedAt: iso(row.ended_at),
    clockClass: row.clock_class,
    voidedAt: iso(row.voided_at),
    subjectTechnicianName: row.technician_name,
    replacesSpanId: row.replaces_span_id,
  }))
}

async function currentSpan(
  db: Database,
  ticketId: string,
): Promise<CurrentTimeSpan | null> {
  const result = await db.execute(sql`
    select
      ts.id, ts.kind, ts.started_at, ts.ended_at, ts.clock_class, ts.origin,
      ts.subject_technician_id, te.full_name as technician_name
    from public.time_spans ts
    left join public.technicians te on te.id = ts.subject_technician_id
    where ts.ticket_id = ${ticketId}
      and ts.voided_at is null
      and ts.ended_at is null
    order by ts.started_at desc, ts.id desc
    limit 1
  `)
  const row = result.rows[0] as
    | {
        id: string
        kind: string
        started_at: Date | string
        ended_at: Date | string | null
        clock_class: string
        origin: string
        subject_technician_id: string | null
        technician_name: string | null
      }
    | undefined
  if (!row) return null
  return {
    id: row.id,
    kind: row.kind,
    startedAt: new Date(row.started_at).toISOString(),
    endedAt: iso(row.ended_at),
    clockClass: row.clock_class,
    origin: row.origin,
    subjectTechnicianId: row.subject_technician_id,
    subjectTechnicianName: row.technician_name,
  }
}

async function defaultTechnician(
  db: Database,
  ticketId: string,
  current: CurrentTimeSpan | null,
): Promise<{ id: string; name: string } | null> {
  if (current?.subjectTechnicianId) {
    return {
      id: current.subjectTechnicianId,
      name: current.subjectTechnicianName ?? '',
    }
  }
  const result = await db.execute(sql`
    select a.assignee_technician_id as id, te.full_name as name
    from public.ticket_assignments a
    join public.technicians te on te.id = a.assignee_technician_id
    where a.ticket_id = ${ticketId}
      and a.ended_at is null
      and a.assignee_technician_id is not null
    order by a.assigned_at desc
    limit 1
  `)
  return (result.rows[0] as { id: string; name: string } | undefined) ?? null
}

/** Contexto de tiempos: tramos manuales, tramo abierto y técnico sugerido. */
export async function manualTimeContext(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<{ items: ManualTimeItem[]; context: ManualTimeContext } | null> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return null
  const ticket = await db.execute(sql`
    select status from public.tickets where id = ${ticketId} limit 1
  `)
  const status = (ticket.rows[0] as { status?: string } | undefined)?.status
  if (!status) return null
  const current = await currentSpan(db, ticketId)
  const technician = await defaultTechnician(db, ticketId, current)
  return {
    items: await manualTimeRows(db, ticketId),
    context: {
      status,
      current,
      defaultTechnicianId: technician?.id ?? null,
      defaultTechnicianName: technician?.name ?? null,
    },
  }
}
