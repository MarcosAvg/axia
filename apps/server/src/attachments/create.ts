import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { assertCanReserveAttachment } from './access.js'
import { loadProblemAttachmentRule } from './requirements.js'
import type { CreateAttachmentInput } from './schemas.js'
import { isAttachmentMimeType } from './types.js'

export type CreateAttachmentContext = {
  db: Database
  config: AppConfig
  ready: Promise<void>
}

export type CreateAttachmentResult = {
  attachmentId: string
  uploadUrl: string
  maxSize: number
  quotaRemaining: number
  replayed: boolean
}

type ExistingRow = {
  id: string
  uploaded_by: string
  problem_id: string
  declared_mime_type: string | null
}

async function quotaUsed(db: Database, actorId: string): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(sum(size_bytes), 0)::bigint as used
    from public.ticket_attachments
    where uploaded_by = ${actorId} and processing_state = 'ready'
  `)
  return Number(
    (result.rows[0] as { used: string | number } | undefined)?.used ?? 0,
  )
}

async function existingAttachment(
  db: Database,
  actor: Actor,
  input: CreateAttachmentInput,
): Promise<ExistingRow | null> {
  const result = await db.execute(sql`
    select id, uploaded_by, problem_id, declared_mime_type
    from public.ticket_attachments
    where client_request_id = ${input.clientRequestId}
    limit 1
  `)
  const row = result.rows[0] as ExistingRow | undefined
  if (!row) return null
  if (
    row.uploaded_by !== actor.id ||
    row.problem_id !== input.problemId ||
    row.declared_mime_type !== input.declaredMimeType
  ) {
    throw new AppError(
      409,
      'conflict',
      'La clave de idempotencia ya se usó para otro adjunto',
    )
  }
  return row
}

function replay(
  config: AppConfig,
  attachmentId: string,
  used: number,
): CreateAttachmentResult {
  return {
    attachmentId,
    uploadUrl: '/api/attachment-uploads',
    maxSize: config.ATTACHMENT_MAX_BYTES,
    quotaRemaining: Math.max(0, config.ATTACHMENT_QUOTA_BYTES - used),
    replayed: true,
  }
}

export async function createAttachment(
  context: CreateAttachmentContext,
  actor: Actor,
  input: CreateAttachmentInput,
): Promise<CreateAttachmentResult> {
  const { db, config } = context
  await context.ready
  await assertCanReserveAttachment(db, actor, input)

  const existing = await existingAttachment(db, actor, input)
  if (existing) {
    return replay(config, existing.id, await quotaUsed(db, actor.id))
  }

  const rule = await loadProblemAttachmentRule(db, input.problemId)
  if (rule.types.length === 0) {
    throw new AppError(
      422,
      'attachment_not_required',
      'El problema no exige adjunto',
    )
  }
  if (
    !isAttachmentMimeType(input.declaredMimeType) ||
    !rule.types.includes(input.declaredMimeType)
  ) {
    throw new AppError(
      422,
      'attachment_type_not_allowed',
      'El tipo de archivo no está permitido para este problema',
    )
  }
  if (input.sizeBytes > config.ATTACHMENT_MAX_BYTES) {
    throw new AppError(
      413,
      'payload_too_large',
      'El archivo supera el tamaño máximo',
    )
  }

  const used = await quotaUsed(db, actor.id)
  if (used >= config.ATTACHMENT_QUOTA_BYTES) {
    throw new AppError(
      413,
      'quota_exceeded',
      'Has alcanzado tu cuota de adjuntos',
    )
  }

  const inserted = await db.execute(sql`
    insert into public.ticket_attachments (
      problem_id, client_request_id, uploaded_by, original_name,
      declared_mime_type, size_bytes
    ) values (
      ${input.problemId}, ${input.clientRequestId}, ${actor.id},
      ${input.fileName}, ${input.declaredMimeType}, ${input.sizeBytes}
    )
    returning id
  `)
  const attachmentId = (inserted.rows[0] as { id: string }).id
  return {
    attachmentId,
    uploadUrl: '/api/attachment-uploads',
    maxSize: config.ATTACHMENT_MAX_BYTES,
    quotaRemaining: Math.max(0, config.ATTACHMENT_QUOTA_BYTES - used),
    replayed: false,
  }
}
