import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { runTicketAction } from '../tickets/actions.js'
import { validateManualActionTime } from '../tickets/action-time.js'
import { withOccurredAt } from '../tickets/event-context.js'
import { ticketActionSchema } from '../tickets/schemas.js'

export type SyncItem = {
  clientRequestId: string
  ticketId: string
  type: string
  args: Record<string, unknown>
  occurredAt: string
  manualTime?: boolean
}

type SyncStatus = 'applied' | 'duplicate' | 'rejected' | 'conflict' | 'blocked'

export type SyncResult = {
  clientRequestId: string
  status: SyncStatus
  code?: string
  message?: string
  details?: unknown
  currentState?: string
  eventId?: number
  blockedBy?: string
}

type TicketInfo = {
  reported_at: Date | string
}

function rejected(
  item: SyncItem,
  code: string,
  message: string,
  details?: unknown,
): SyncResult {
  return {
    clientRequestId: item.clientRequestId,
    status: 'rejected',
    code,
    message,
    details,
  }
}

async function ticketInfo(
  db: Database,
  ticketId: string,
): Promise<TicketInfo | null> {
  const result = await db.execute(sql`
    select reported_at from public.tickets where id = ${ticketId} limit 1
  `)
  return (result.rows[0] as TicketInfo | undefined) ?? null
}

function validateOccurredAt(
  item: SyncItem,
  ticket: TicketInfo,
  config: AppConfig,
): string | null {
  const occurred = Date.parse(item.occurredAt)
  if (!Number.isFinite(occurred)) return 'La fecha de la acción no es válida'
  const reported = new Date(ticket.reported_at).getTime()
  if (occurred < reported) {
    return 'La acción es anterior a la creación del tiquet'
  }
  const now = Date.now()
  if (occurred > now + config.SYNC_FUTURE_TOLERANCE_MS) {
    return 'La acción está demasiado en el futuro'
  }
  if (!item.manualTime && occurred < now - config.SYNC_MAX_AGE_MS) {
    return 'La acción es demasiado antigua'
  }
  return null
}

async function currentState(
  db: Database,
  ticketId: string,
): Promise<string | undefined> {
  const result = await db.execute(sql`
    select status from public.tickets where id = ${ticketId} limit 1
  `)
  return (result.rows[0] as { status: string } | undefined)?.status
}

async function eventId(
  db: Database,
  clientRequestId: string,
): Promise<number | undefined> {
  const result = await db.execute(sql`
    select id from public.ticket_events
    where client_request_id = ${clientRequestId}
    limit 1
  `)
  const id = (result.rows[0] as { id: string | number } | undefined)?.id
  return id === undefined ? undefined : Number(id)
}

async function executeItem(
  db: Database,
  actor: Actor,
  config: AppConfig,
  item: SyncItem,
): Promise<SyncResult> {
  const ticket = await ticketInfo(db, item.ticketId)
  if (!ticket) return rejected(item, 'not_found', 'Tiquet no encontrado')
  const timeError = validateOccurredAt(item, ticket, config)
  if (timeError) {
    return rejected(item, 'invalid_occurred_at', timeError)
  }

  const parsed = ticketActionSchema.safeParse({
    ...item.args,
    action: item.type,
    clientRequestId: item.clientRequestId,
  })
  if (!parsed.success) {
    return rejected(
      item,
      'invalid_action',
      'La acción no es válida',
      parsed.error.issues,
    )
  }

  try {
    if (item.manualTime) {
      await validateManualActionTime({
        db,
        actor,
        ticketId: item.ticketId,
        occurredAt: item.occurredAt,
      })
    }
    const result = await withOccurredAt(item.occurredAt, () =>
      runTicketAction(db, actor, item.ticketId, parsed.data),
    )
    return {
      clientRequestId: item.clientRequestId,
      status: result.replayed ? 'duplicate' : 'applied',
      currentState: await currentState(db, item.ticketId),
      eventId: await eventId(db, item.clientRequestId),
    }
  } catch (error) {
    if (error instanceof AppError) {
      return {
        clientRequestId: item.clientRequestId,
        status: error.statusCode === 409 ? 'conflict' : 'rejected',
        code: error.code,
        message: error.message,
        currentState: await currentState(db, item.ticketId),
      }
    }
    return rejected(item, 'internal_error', 'No se pudo aplicar la acción')
  }
}

export async function runSync(
  db: Database,
  actor: Actor,
  config: AppConfig,
  items: SyncItem[],
): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  const blocked = new Map<string, string>()

  for (const item of items) {
    const blockedBy = blocked.get(item.ticketId)
    if (blockedBy) {
      results.push({
        clientRequestId: item.clientRequestId,
        status: 'blocked',
        code: 'blocked_by_previous',
        message: 'Hay una acción anterior fallida para este tiquet',
        blockedBy,
      })
      continue
    }
    const result = await executeItem(db, actor, config, item)
    if (result.status === 'rejected' || result.status === 'conflict') {
      blocked.set(item.ticketId, item.clientRequestId)
    }
    results.push(result)
  }
  return results
}
