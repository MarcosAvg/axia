import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { parseActionTime } from '../tickets/action-time.js'
import { parseInstanceWallClock } from '../tickets/instance-time.js'
import { classifyClientTime } from '../tickets/time-classification.js'
import type { CreateEvidenceInput } from './schemas.js'

export type EvidenceTime = {
  occurredAt?: string
  clientCapturedAt?: string
  timeConfidence: 'trusted' | 'unverified' | 'corrected'
  clientReportedAt?: string
  clientClockSkewMs?: number | null
  timeAlertKind?: 'clock_skew' | 'clock_unknown' | null
  suggestedOccurredAt?: string | null
}

async function manualEvidenceTime(
  db: Database,
  actor: Actor,
  input: CreateEvidenceInput,
): Promise<string | undefined> {
  if (input.occurredLocal) {
    if (!hasPermission(actor, 'time.record_manual')) {
      throw new AppError(
        403,
        'forbidden',
        'No tienes permiso para adjuntar evidencia',
      )
    }
    return (await parseInstanceWallClock(db, input.occurredLocal)).toISOString()
  }
  if (input.occurredAt) {
    if (!hasPermission(actor, 'time.record_manual')) {
      throw new AppError(
        403,
        'forbidden',
        'No tienes permiso para adjuntar evidencia',
      )
    }
    parseActionTime(input.occurredAt)
    return new Date(input.occurredAt).toISOString()
  }
  return undefined
}

/** Hora oficial de la evidencia: manual, del dispositivo o del servidor. */
export async function evidenceTime({
  db,
  config,
  actor,
  ticketId,
  input,
}: {
  db: Database
  config: AppConfig
  actor: Actor
  ticketId: string
  input: CreateEvidenceInput
}): Promise<EvidenceTime> {
  const manual = await manualEvidenceTime(db, actor, input)
  if (manual) return { occurredAt: manual, timeConfidence: 'trusted' }
  if (!input.clientCapturedAt) return { timeConfidence: 'trusted' }

  const classified = await classifyClientTime({
    db,
    ticketId,
    clientReportedAt: input.clientCapturedAt,
    deviceNow: input.deviceNow,
    futureToleranceMs: config.SYNC_FUTURE_TOLERANCE_MS,
    maxAgeMs: config.SYNC_MAX_AGE_MS,
  })
  if (classified.rejection) {
    throw new AppError(
      400,
      classified.rejection.code,
      classified.rejection.message,
    )
  }
  return {
    occurredAt: classified.occurredAt,
    clientCapturedAt: input.clientCapturedAt,
    timeConfidence: classified.timeConfidence,
    clientReportedAt: classified.clientReportedAt,
    clientClockSkewMs: classified.clientClockSkewMs,
    timeAlertKind: classified.alertKind,
    suggestedOccurredAt: classified.suggestedOccurredAt,
  }
}
