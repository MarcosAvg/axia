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
  subjectRequesterId?: string | null
  occurredAt?: string
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

function normalizedEvent(input: EventInput) {
  return {
    ...input,
    actorId: input.actorId ?? null,
    clientRequestId: input.clientRequestId ?? null,
    payload: input.payload ?? {},
    reasonId: input.reasonId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    subjectTechnicianId: input.subjectTechnicianId ?? null,
    subjectRequesterId: input.subjectRequesterId ?? null,
    occurredAt:
      input.occurredAt ?? currentOccurredAt() ?? new Date().toISOString(),
  }
}

export async function writeEvent(
  executor: DbExecutor,
  input: EventInput,
): Promise<{ id: string }> {
  const event = normalizedEvent(input)
  const result = await executor.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, subject_user_id, subject_technician_id,
      subject_requester_id, reason_id, payload, client_request_id, occurred_at
    )
    select
      t.id, t.cycle, ${event.type}, ${event.actorId}, ${event.subjectUserId},
      ${event.subjectTechnicianId}, ${event.subjectRequesterId},
      ${event.reasonId}, ${JSON.stringify(event.payload)}::jsonb,
      ${event.clientRequestId}, ${event.occurredAt}::timestamptz
    from public.tickets t
    where t.id = ${event.ticketId}
    returning id
  `)
  const row = result.rows[0] as { id: string } | undefined
  if (!row) throw new Error('Event could not be written')
  return { id: row.id }
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
