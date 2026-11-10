import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'
import type { TimeAlertKind } from './event-context.js'
import { findVisibleTicket } from './repository.js'

export type TimeAlertItem = {
  id: string
  eventId: number
  eventType: string
  kind: string
  clientClockSkewMs: number | null
  suggestedOccurredAt: string | null
  occurredAt: string
  detectedAt: string
}

type AlertRow = {
  id: string
  event_id: string | number
  event_type: string
  kind: string
  client_clock_skew_ms: number | null
  suggested_occurred_at: Date | string | null
  occurred_at: Date | string
  detected_at: Date | string
}

export type InsertTimeAlertInput = {
  ticketId: string
  eventId: string
  kind: TimeAlertKind
  clientClockSkewMs: number | null
  suggestedOccurredAt: string | null
}

/** Inserta la alerta de forma idempotente; devuelve el id si es nueva. */
export async function insertTimeAlert(
  executor: DbExecutor,
  input: InsertTimeAlertInput,
): Promise<string | null> {
  const result = await executor.execute(sql`
    insert into public.ticket_time_alerts (
      ticket_id, event_id, kind, client_clock_skew_ms, suggested_occurred_at
    ) values (
      ${input.ticketId}, ${input.eventId}, ${input.kind},
      ${input.clientClockSkewMs}, ${input.suggestedOccurredAt}::timestamptz
    )
    on conflict do nothing
    returning id
  `)
  return (result.rows[0] as { id: string } | undefined)?.id ?? null
}

/** Lanza 409 si el tiquet tiene alertas de tiempo abiertas. */
export async function assertTimeVerified(
  tx: DbExecutor,
  ticketId: string,
): Promise<void> {
  const result = await tx.execute(sql`
    select a.id, a.event_id, a.kind, a.client_clock_skew_ms,
      a.suggested_occurred_at, e.type as event_type, e.occurred_at
    from public.ticket_time_alerts a
    join public.ticket_events e on e.id = a.event_id
    where a.ticket_id = ${ticketId} and a.status = 'open'
    order by a.detected_at, a.id
  `)
  if (result.rows.length === 0) return
  throw new AppError(
    409,
    'time_unverified',
    'Corrige la hora de las acciones pendientes',
    { details: { alerts: result.rows } },
  )
}

export async function listTimeAlerts(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<TimeAlertItem[] | null> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return null
  const result = await db.execute(sql`
    select a.id, a.event_id, e.type as event_type, a.kind,
      a.client_clock_skew_ms, a.suggested_occurred_at,
      e.occurred_at, a.detected_at
    from public.ticket_time_alerts a
    join public.ticket_events e on e.id = a.event_id
    where a.ticket_id = ${ticketId} and a.status = 'open'
    order by a.detected_at, a.id
  `)
  return (result.rows as AlertRow[]).map((row) => ({
    id: row.id,
    eventId: Number(row.event_id),
    eventType: row.event_type,
    kind: row.kind,
    clientClockSkewMs: row.client_clock_skew_ms,
    suggestedOccurredAt: toIso(row.suggested_occurred_at),
    occurredAt: toIso(row.occurred_at) as string,
    detectedAt: toIso(row.detected_at) as string,
  }))
}

function toIso(value: Date | string | null): string | null {
  return value === null ? null : new Date(value).toISOString()
}
