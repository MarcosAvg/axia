import { sql } from 'drizzle-orm'

import type { DbExecutor } from './db.js'
import type { TimeAlertKind, TimeConfidence } from './event-context.js'

type TimeRejectionCode =
  'time_out_of_order' | 'time_future' | 'time_too_old' | 'time_invalid'

type TimeRejection = {
  code: TimeRejectionCode
  message: string
}

export type TimeClassification = {
  occurredAt: string
  clientReportedAt: string
  timeConfidence: TimeConfidence
  clientClockSkewMs: number | null
  suggestedOccurredAt: string | null
  alertKind: TimeAlertKind | null
  rejection: TimeRejection | null
}

export type ClassifyClientTimeInput = {
  db: DbExecutor
  ticketId: string
  clientReportedAt: string
  deviceNow?: string | null
  futureToleranceMs: number
  maxAgeMs: number
}

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000

async function serverNow(db: DbExecutor): Promise<Date> {
  const result = await db.execute(sql`select now() as at`)
  return new Date((result.rows[0] as { at: Date | string }).at)
}

async function toleranceMs(db: DbExecutor): Promise<number> {
  const result = await db.execute(sql`
    select extract(epoch from time_sync_tolerance) * 1000 as ms
    from public.instance_settings
    limit 1
  `)
  const value = (result.rows[0] as { ms: number | string } | undefined)?.ms
  return value === undefined ? DEFAULT_TOLERANCE_MS : Number(value)
}

async function lastEventAt(
  db: DbExecutor,
  ticketId: string,
): Promise<Date | null> {
  const result = await db.execute(sql`
    select max(occurred_at) as at
    from public.ticket_events
    where ticket_id = ${ticketId}
      and type not in ('event_time_corrected', 'time_alert')
  `)
  const value = (result.rows[0] as { at: Date | string | null } | undefined)?.at
  return value ? new Date(value) : null
}

function rejected(
  code: TimeRejectionCode,
  message: string,
): TimeClassification {
  return {
    occurredAt: '',
    clientReportedAt: '',
    timeConfidence: 'unverified',
    clientClockSkewMs: null,
    suggestedOccurredAt: null,
    alertKind: null,
    rejection: { code, message },
  }
}

function unverified(
  clientAt: string,
  skewMs: number | null,
  alertKind: TimeAlertKind,
  suggestedOccurredAt: string | null = null,
): TimeClassification {
  return {
    occurredAt: clientAt,
    clientReportedAt: clientAt,
    timeConfidence: 'unverified',
    clientClockSkewMs: skewMs,
    suggestedOccurredAt,
    alertKind,
    rejection: null,
  }
}

function trusted(clientAt: string, skewMs: number): TimeClassification {
  return {
    occurredAt: clientAt,
    clientReportedAt: clientAt,
    timeConfidence: 'trusted',
    clientClockSkewMs: skewMs,
    suggestedOccurredAt: null,
    alertKind: null,
    rejection: null,
  }
}

async function validateOrder(
  input: ClassifyClientTimeInput,
  clientTime: number,
  now: Date,
): Promise<TimeRejection | null> {
  const last = await lastEventAt(input.db, input.ticketId)
  if (last && clientTime < last.getTime()) {
    return {
      code: 'time_out_of_order',
      message: 'La acción no puede ser anterior a la acción previa',
    }
  }
  if (clientTime > now.getTime() + input.futureToleranceMs) {
    return {
      code: 'time_future',
      message:
        'La acción está demasiado en el futuro; corrige la hora manualmente',
    }
  }
  if (clientTime < now.getTime() - input.maxAgeMs) {
    return {
      code: 'time_too_old',
      message: 'La acción es demasiado antigua; corrige la hora manualmente',
    }
  }
  return null
}

async function classifyBySkew(
  db: DbExecutor,
  clientAt: string,
  clientTime: number,
  deviceNow: string | null | undefined,
): Promise<TimeClassification> {
  if (!deviceNow) {
    return unverified(clientAt, null, 'clock_unknown')
  }
  const deviceTime = Date.parse(deviceNow)
  if (!Number.isFinite(deviceTime)) {
    return unverified(clientAt, null, 'clock_unknown')
  }
  const now = await serverNow(db)
  const skewMs = deviceTime - now.getTime()
  const tolerance = await toleranceMs(db)
  if (Math.abs(skewMs) > tolerance) {
    return unverified(
      clientAt,
      skewMs,
      'clock_skew',
      new Date(clientTime - skewMs).toISOString(),
    )
  }
  return trusted(clientAt, skewMs)
}

/**
 * Clasifica la hora de una acción offline. No escribe nada: solo decide si
 * la hora es utilizable, no confiable o debe rechazarse.
 */
export async function classifyClientTime(
  input: ClassifyClientTimeInput,
): Promise<TimeClassification> {
  const clientTime = Date.parse(input.clientReportedAt)
  if (!Number.isFinite(clientTime)) {
    return rejected('time_invalid', 'La fecha de la acción no es válida')
  }

  const now = await serverNow(input.db)
  const orderError = await validateOrder(input, clientTime, now)
  if (orderError) return rejected(orderError.code, orderError.message)

  return classifyBySkew(
    input.db,
    new Date(clientTime).toISOString(),
    clientTime,
    input.deviceNow,
  )
}
