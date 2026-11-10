import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from '../tickets/db.js'
import { writeEvent } from '../tickets/events.js'
import { assertTechnicianAction } from '../tickets/proxy.js'
import { findVisibleTicket } from '../tickets/repository.js'
import { canAttachEvidence } from './access.js'
import { evidenceTime, type EvidenceTime } from './evidence-time.js'
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

async function ticketCycle(db: DbExecutor, ticketId: string): Promise<number> {
  const result = await db.execute(sql`
    select cycle from public.tickets where id = ${ticketId} limit 1
  `)
  const row = result.rows[0] as { cycle: number } | undefined
  if (!row) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  return row.cycle
}

async function captureCycle(
  db: DbExecutor,
  ticketId: string,
  requested: number | undefined,
): Promise<number> {
  const current = await ticketCycle(db, ticketId)
  if (requested !== undefined && requested > current) {
    throw new AppError(
      400,
      'invalid_cycle',
      'El ciclo de captura no puede ser mayor al ciclo actual',
    )
  }
  return requested ?? current
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

async function evidenceSubjects(
  tx: DbExecutor,
  ticketId: string,
  actor: Actor,
  input: CreateEvidenceInput,
): Promise<{
  technicianSubject: string | null
  requesterSubject: string | null
}> {
  const ticket = await tx.execute(sql`
    select requester_id from public.tickets where id = ${ticketId}
  `)
  const requesterId = (ticket.rows[0] as { requester_id: string }).requester_id
  return {
    technicianSubject: ['before', 'during', 'after'].includes(input.type)
      ? (input.subjectTechnicianId ?? actor.technicianId)
      : null,
    requesterSubject:
      input.type === 'claim' || input.type === 'request' ? requesterId : null,
  }
}

async function insertEvidence({
  db,
  actor,
  ticketId,
  cycle,
  input,
  time,
}: {
  db: Database
  actor: Actor
  ticketId: string
  cycle: number
  input: CreateEvidenceInput
  time: EvidenceTime
}): Promise<string> {
  return db.transaction(async (tx) => {
    const { technicianSubject, requesterSubject } = await evidenceSubjects(
      tx,
      ticketId,
      actor,
      input,
    )
    const inserted = await tx.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id,
        captured_by_user_id, uploaded_by, client_request_id, mime_type,
        occurred_at, client_captured_at, time_confidence
      ) values (
        ${ticketId}, ${cycle}, ${input.type}, ${technicianSubject},
        ${actor.id}, ${actor.id}, ${input.clientRequestId}, ${input.mimeType ?? null},
        coalesce(${time.occurredAt ?? null}::timestamptz, now()),
        ${time.clientCapturedAt ?? null}::timestamptz,
        ${time.timeConfidence}::public.time_confidence
      )
      returning id
    `)
    const evidenceId = (inserted.rows[0] as { id: string }).id
    const event = await writeEvent(tx, {
      ticketId,
      type: 'evidence_added',
      actorId: actor.id,
      clientRequestId: input.clientRequestId,
      subjectTechnicianId: technicianSubject,
      subjectRequesterId: requesterSubject,
      payload: { evidenceId, type: input.type },
      occurredAt: time.occurredAt,
      timeConfidence: time.timeConfidence,
      clientReportedAt: time.clientReportedAt,
      clientClockSkewMs: time.clientClockSkewMs,
      timeAlertKind: time.timeAlertKind,
      suggestedOccurredAt: time.suggestedOccurredAt,
    })
    await tx.execute(sql`
      update public.evidence set event_id = ${event.id} where id = ${evidenceId}
    `)
    return evidenceId
  })
}

async function assertEvidenceSubject(
  db: Database,
  actor: Actor,
  access: NonNullable<Awaited<ReturnType<typeof findVisibleTicket>>>,
  input: CreateEvidenceInput,
) {
  if (input.subjectTechnicianId) {
    if (!['before', 'during', 'after'].includes(input.type)) {
      throw new AppError(
        400,
        'validation',
        'El sujeto técnico solo aplica a evidencia de trabajo',
      )
    }
    await assertTechnicianAction({
      db,
      actor,
      access,
      permission: 'ticket.record_progress',
      subjectTechnicianId: input.subjectTechnicianId,
    })
    return
  }
  if (!canAttachEvidence(actor, access, input.type)) {
    throw forbidden()
  }
}

export async function createEvidence(
  context: CreateContext,
  actor: Actor,
  ticketId: string,
  input: CreateEvidenceInput,
): Promise<CreateEvidenceResult> {
  const { db, config } = context
  await context.ready
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) {
    throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  }
  await assertEvidenceSubject(db, actor, access, input)
  const time = await evidenceTime({
    db,
    config,
    actor,
    ticketId,
    input,
  })
  const cycle = await captureCycle(db, ticketId, input.cycle)
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
  const evidenceId = await insertEvidence({
    db,
    actor,
    ticketId,
    cycle,
    input,
    time,
  })
  return {
    evidenceId,
    uploadUrl: `/api/uploads/${evidenceId}`,
    maxSize: config.EVIDENCE_MAX_BYTES,
    quotaRemaining: Math.max(0, config.EVIDENCE_QUOTA_BYTES - used),
    replayed: false,
  }
}
