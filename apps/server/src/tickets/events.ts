import { sql } from 'drizzle-orm'

import type { DbExecutor } from './db.js'
import { currentOccurredAt } from './event-context.js'

export type HandledEvent = {
  ticketId: string
  type: string
}

export type EventInput = {
  ticketId: string
  type: string
  actorId?: string | null
  clientRequestId?: string | null
  payload?: Record<string, unknown>
  reasonId?: string | null
  subjectUserId?: string | null
  subjectTechnicianId?: string | null
}

export async function findHandledEvent(
  executor: DbExecutor,
  clientRequestId: string,
): Promise<HandledEvent | null> {
  const result = await executor.execute(sql`
    select ticket_id, type
    from public.ticket_events
    where client_request_id = ${clientRequestId}
    limit 1
  `)
  const row = result.rows[0] as { ticket_id: string; type: string } | undefined
  return row ? { ticketId: row.ticket_id, type: row.type } : null
}

export async function writeEvent(
  executor: DbExecutor,
  {
    ticketId,
    type,
    actorId,
    clientRequestId,
    payload = {},
    reasonId = null,
    subjectUserId = null,
    subjectTechnicianId = null,
  }: EventInput,
) {
  await executor.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, subject_user_id, subject_technician_id,
      reason_id, payload, client_request_id, occurred_at
    )
    select
      t.id, t.cycle, ${type}, ${actorId ?? null}, ${subjectUserId},
      ${subjectTechnicianId}, ${reasonId}, ${JSON.stringify(payload)}::jsonb,
      ${clientRequestId ?? null},
      ${currentOccurredAt() ?? new Date().toISOString()}::timestamptz
    from public.tickets t
    where t.id = ${ticketId}
  `)
}

function postgresError(error: unknown): Record<string, unknown> | null {
  let current = error
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return null
    if ('code' in current || 'constraint' in current) {
      return current as Record<string, unknown>
    }
    current = 'cause' in current ? current.cause : null
  }
  return null
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresError(error)?.code === '23505'
}
