import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can } from '../auth/authorization.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'

export const TOLERANCE_MS = 60_000

type TicketClock = {
  reported_at: Date | string
  closed_at: Date | string | null
  cycle: number
  status: string
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

export function assertTimePermission(actor: Actor): void {
  if (!can(actor, 'time.record_manual')) {
    throw new AppError(
      403,
      'forbidden',
      'No tienes permiso para ajustar la hora de las acciones',
    )
  }
}

export async function serverNow(db: DbExecutor): Promise<Date> {
  const result = await db.execute(sql`select now() as at`)
  return new Date((result.rows[0] as { at: Date | string }).at)
}

export async function ticketClock(
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

export async function lastActionTime(
  db: DbExecutor,
  ticketId: string,
  cycle: number,
): Promise<Date | null> {
  const result = await db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId}
      and cycle = ${cycle}
      and type not in ('event_time_corrected', 'time_alert')
    order by occurred_at desc, id desc
    limit 1
  `)
  const value = (result.rows[0] as { occurred_at: Date | string } | undefined)
    ?.occurred_at
  return value ? new Date(value) : null
}

export async function assertFolioYear(
  tx: DbExecutor,
  reportedAt: Date | string,
  proposed: Date,
): Promise<void> {
  const result = await tx.execute(sql`
    select
      to_char(${reportedAt}::timestamptz at time zone s.timezone, 'YYYY')
        as current_year,
      to_char(${proposed}::timestamptz at time zone s.timezone, 'YYYY')
        as proposed_year
    from public.instance_settings s
    limit 1
  `)
  const row = result.rows[0] as
    { current_year: string; proposed_year: string } | undefined
  if (row && row.current_year !== row.proposed_year) {
    throw new AppError(
      409,
      'folio_year_change',
      'El folio no cambia de año: ajusta la hora dentro del mismo año',
    )
  }
}
