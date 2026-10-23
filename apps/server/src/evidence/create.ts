import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { parseActionTime } from '../tickets/action-time.js'
import { findVisibleTicket } from '../tickets/repository.js'
import type { CreateEvidenceInput } from './schemas.js'

export type CreateContext = {
  db: Database
  config: AppConfig
  ready: Promise<void>
}

export type CreateEvidenceResult = {
  evidenceId: string
  uploadUrl: string
  maxSize: number
  quotaRemaining: number
  replayed: boolean
}

function forbidden(): AppError {
  return new AppError(
    403,
    'forbidden',
    'No tienes permiso para adjuntar evidencia',
  )
}

async function ticketCycle(db: Database, ticketId: string): Promise<number> {
  const result = await db.execute(sql`
    select cycle from public.tickets where id = ${ticketId} limit 1
  `)
  const row = result.rows[0] as { cycle: number } | undefined
  if (!row) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  return row.cycle
}

async function quotaUsed(db: Database, actorId: string): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(sum(size_bytes), 0)::bigint as used
    from public.evidence
    where uploaded_by = ${actorId} and processing_state = 'ready'
  `)
  return Number(
    (result.rows[0] as { used: string | number } | undefined)?.used ?? 0,
  )
}

async function existingEvidence(
  db: Database,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
) {
  const result = await db.execute(sql`
    select id, ticket_id, uploaded_by
    from public.evidence
    where client_request_id = ${clientRequestId}
    limit 1
  `)
  const row = result.rows[0] as
    { id: string; ticket_id: string; uploaded_by: string | null } | undefined
  if (!row) return null
  if (row.ticket_id !== ticketId || row.uploaded_by !== actor.id) {
    throw new AppError(
      409,
      'conflict',
      'La clave de idempotencia ya se usó para otra evidencia',
    )
  }
  return row
}

async function ensureQuota(
  db: Database,
  actor: Actor,
  config: AppConfig,
): Promise<number> {
  const used = await quotaUsed(db, actor.id)
  if (used >= config.EVIDENCE_QUOTA_BYTES) {
    throw new AppError(
      413,
      'quota_exceeded',
      'Has alcanzado tu cuota de evidencias',
    )
  }
  return used
}

async function insertEvidence(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: CreateEvidenceInput,
): Promise<string> {
  const cycle = await ticketCycle(db, ticketId)
  const inserted = await db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id,
      captured_by_user_id, uploaded_by, client_request_id, mime_type, occurred_at
    ) values (
      ${ticketId}, ${cycle}, ${input.type}, ${actor.technicianId},
      ${actor.id}, ${actor.id}, ${input.clientRequestId}, ${input.mimeType ?? null},
      ${input.occurredAt ?? new Date().toISOString()}
    )
    returning id
  `)
  return (inserted.rows[0] as { id: string }).id
}

export async function createEvidence(
  context: CreateContext,
  actor: Actor,
  ticketId: string,
  input: CreateEvidenceInput,
): Promise<CreateEvidenceResult> {
  const { db, config } = context
  await context.ready
  if (!(await findVisibleTicket(db, actor, ticketId))) {
    throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  }
  if (
    !hasPermission(actor, 'evidence.attach') &&
    !hasPermission(actor, 'ticket.record_progress')
  ) {
    throw forbidden()
  }
  if (input.occurredAt) {
    if (!hasPermission(actor, 'time.record_manual')) throw forbidden()
    parseActionTime(input.occurredAt)
  }
  const existing = await existingEvidence(
    db,
    actor,
    ticketId,
    input.clientRequestId,
  )
  const used = existing
    ? await quotaUsed(db, actor.id)
    : await ensureQuota(db, actor, config)
  if (existing) {
    return {
      evidenceId: existing.id,
      uploadUrl: `/api/uploads/${existing.id}`,
      maxSize: config.EVIDENCE_MAX_BYTES,
      quotaRemaining: Math.max(0, config.EVIDENCE_QUOTA_BYTES - used),
      replayed: true,
    }
  }
  const evidenceId = await insertEvidence(db, actor, ticketId, input)
  return {
    evidenceId,
    uploadUrl: `/api/uploads/${evidenceId}`,
    maxSize: config.EVIDENCE_MAX_BYTES,
    quotaRemaining: Math.max(0, config.EVIDENCE_QUOTA_BYTES - used),
    replayed: false,
  }
}
