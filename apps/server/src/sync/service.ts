import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { runTicketAction } from '../tickets/actions.js'
import { validateManualActionTime } from '../tickets/action-time.js'
import { withActionContext } from '../tickets/event-context.js'
import type { TicketActionInput } from '../tickets/schemas.js'
import { ticketActionSchema } from '../tickets/schemas.js'
import {
  classifyClientTime,
  type TimeClassification,
} from '../tickets/time-classification.js'

type SyncItem = {
  clientRequestId: string
  ticketId: string
  type: string
  args: Record<string, unknown>
  clientReportedAt?: string
  occurredAt?: string
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
  timeStatus?: 'ok' | 'skew_detected' | 'manual_required'
  clockSkewMs?: number | null
  suggestedOccurredAt?: string | null
  timeAlertKind?: 'clock_skew' | 'clock_unknown' | null
}

export type SyncRequest = {
  items: SyncItem[]
  deviceNow?: string
}

type ExecuteContext = {
  db: Database
  actor: Actor
  config: AppConfig
  item: SyncItem
  deviceNow?: string
}

type TicketInfo = {
  reported_at: Date | string
}

type TimeFields = Pick<
  SyncResult,
  'timeStatus' | 'clockSkewMs' | 'suggestedOccurredAt' | 'timeAlertKind'
>

type AppliedAction = {
  replayed: boolean
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

function timeFields(classified: TimeClassification): TimeFields {
  return {
    clockSkewMs: classified.clientClockSkewMs,
    suggestedOccurredAt: classified.suggestedOccurredAt,
    timeAlertKind: classified.alertKind,
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

async function appliedResult(
  context: ExecuteContext,
  result: AppliedAction,
  time: TimeFields,
): Promise<SyncResult> {
  return {
    clientRequestId: context.item.clientRequestId,
    status: result.replayed ? 'duplicate' : 'applied',
    currentState: await currentState(context.db, context.item.ticketId),
    eventId: await eventId(context.db, context.item.clientRequestId),
    ...time,
  }
}

async function executeManualItem(
  context: ExecuteContext,
  input: TicketActionInput,
): Promise<SyncResult> {
  const { item, db, actor } = context
  if (!item.occurredAt) {
    return {
      ...rejected(item, 'time_invalid', 'Falta la hora manual de la acción'),
      timeStatus: 'manual_required',
    }
  }

  const proposed = await validateManualActionTime({
    db,
    actor,
    ticketId: item.ticketId,
    occurredAt: item.occurredAt,
    subjectTechnicianId:
      'subjectTechnicianId' in input ? input.subjectTechnicianId : undefined,
  })
  const result = await withActionContext(
    {
      occurredAt: proposed.toISOString(),
      clientReportedAt: item.clientReportedAt ?? null,
      timeConfidence: 'corrected',
      clientClockSkewMs: null,
    },
    () => runTicketAction(db, actor, item.ticketId, input),
  )
  return appliedResult(context, result, { timeStatus: 'ok' })
}

async function executeDeviceItem(
  context: ExecuteContext,
  input: TicketActionInput,
): Promise<SyncResult> {
  const { item, db, actor, config } = context
  if (!item.clientReportedAt) {
    return {
      ...rejected(
        item,
        'time_invalid',
        'Falta la hora reportada por el dispositivo',
      ),
      timeStatus: 'manual_required',
    }
  }

  const classified = await classifyClientTime({
    db,
    ticketId: item.ticketId,
    clientReportedAt: item.clientReportedAt,
    deviceNow: context.deviceNow,
    futureToleranceMs: config.SYNC_FUTURE_TOLERANCE_MS,
    maxAgeMs: config.SYNC_MAX_AGE_MS,
  })
  if (classified.rejection) {
    return {
      ...rejected(
        item,
        classified.rejection.code,
        classified.rejection.message,
      ),
      timeStatus: 'manual_required',
      ...timeFields(classified),
    }
  }

  const result = await withActionContext(
    {
      occurredAt: classified.occurredAt,
      clientReportedAt: classified.clientReportedAt,
      timeConfidence: classified.timeConfidence,
      clientClockSkewMs: classified.clientClockSkewMs,
    },
    () => runTicketAction(db, actor, item.ticketId, input),
  )
  return appliedResult(context, result, {
    timeStatus:
      classified.timeConfidence === 'unverified' ? 'skew_detected' : 'ok',
    ...timeFields(classified),
  })
}

async function executeItem(context: ExecuteContext): Promise<SyncResult> {
  const { item, db } = context
  const ticket = await ticketInfo(db, item.ticketId)
  if (!ticket) return rejected(item, 'not_found', 'Tiquet no encontrado')

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
    return item.manualTime
      ? await executeManualItem(context, parsed.data)
      : await executeDeviceItem(context, parsed.data)
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
  request: SyncRequest,
): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  const blocked = new Map<string, string>()

  for (const item of request.items) {
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
    const result = await executeItem({
      db,
      actor,
      config,
      item,
      deviceNow: request.deviceNow,
    })
    if (result.status === 'rejected' || result.status === 'conflict') {
      blocked.set(item.ticketId, item.clientRequestId)
    }
    results.push(result)
  }
  return results
}
