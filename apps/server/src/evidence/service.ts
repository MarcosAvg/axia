import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { findVisibleTicket } from '../tickets/repository.js'
import { createEvidence } from './create.js'
import { ensureStorage, resolveStored, storagePaths } from './paths.js'
import type { CreateEvidenceInput } from './schemas.js'

export type EvidenceRow = {
  id: string
  ticket_id: string
  cycle: number
  type: string
  uploaded_by: string | null
  processing_state: string
  storage_path: string | null
  thumbnail_path: string | null
  mime_type: string | null
  size_bytes: string | null
  occurred_at: Date | string
}

type EvidenceListRow = {
  id: string
  type: string
  mime_type: string | null
  size_bytes: string | null
  occurred_at: Date | string
  processing_state: string
  thumbnail_path: string | null
}

export type EvidenceItem = {
  id: string
  type: string
  mimeType: string | null
  sizeBytes: number | null
  occurredAt: string
  processingState: string
  hasThumbnail: boolean
}

type Context = {
  db: Database
  config: AppConfig
  paths: ReturnType<typeof storagePaths>
  ready: Promise<void>
}

async function listEvidence(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<EvidenceItem[] | null> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return null
  const result = await db.execute(sql`
    select
      id, type, mime_type, size_bytes, occurred_at,
      processing_state, thumbnail_path
    from public.evidence
    where ticket_id = ${ticketId}
    order by occurred_at, id
  `)
  return (result.rows as EvidenceListRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    occurredAt: new Date(row.occurred_at).toISOString(),
    processingState: row.processing_state,
    hasThumbnail: row.thumbnail_path !== null,
  }))
}

async function evidenceFile(
  context: Context,
  actor: Actor,
  evidenceId: string,
  thumbnail: boolean,
): Promise<{ path: string; mimeType: string } | null> {
  const result = await context.db.execute(sql`
    select * from public.evidence where id = ${evidenceId} limit 1
  `)
  const evidence = result.rows[0] as EvidenceRow | undefined
  if (!evidence) return null
  if (!(await findVisibleTicket(context.db, actor, evidence.ticket_id))) {
    return null
  }
  const relative = thumbnail ? evidence.thumbnail_path : evidence.storage_path
  if (!relative) return null
  try {
    return {
      path: resolveStored(context.paths, relative),
      mimeType: thumbnail ? 'image/webp' : (evidence.mime_type ?? 'image/webp'),
    }
  } catch {
    return null
  }
}

async function findForTus(
  db: Database,
  evidenceId: string,
): Promise<EvidenceRow | null> {
  const result = await db.execute(sql`
    select * from public.evidence where id = ${evidenceId} limit 1
  `)
  return (result.rows[0] as EvidenceRow | undefined) ?? null
}

async function markFailed(db: Database, evidenceId: string, message: string) {
  await db.execute(sql`
    update public.evidence
    set
      processing_state = 'failed',
      processing_error = ${message.slice(0, 1000)},
      processed_at = now()
    where id = ${evidenceId}
  `)
}

type CompleteData = {
  storagePath: string
  thumbnailPath: string
  sizeBytes: number
  width: number
  height: number
  sha256: string
}

async function complete(db: Database, evidenceId: string, data: CompleteData) {
  await db.execute(sql`
    update public.evidence
    set
      storage_path = ${data.storagePath},
      thumbnail_path = ${data.thumbnailPath},
      mime_type = 'image/webp',
      size_bytes = ${data.sizeBytes},
      width = ${data.width},
      height = ${data.height},
      sha256 = ${data.sha256},
      processing_state = 'ready',
      processing_error = null,
      processed_at = now()
    where id = ${evidenceId}
  `)
}

async function quotaForUploader(
  db: Database,
  actorId: string,
  excludeId: string,
): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(sum(size_bytes), 0)::bigint as used
    from public.evidence
    where uploaded_by = ${actorId}
      and processing_state = 'ready'
      and id <> ${excludeId}
  `)
  return Number(
    (result.rows[0] as { used: string | number } | undefined)?.used ?? 0,
  )
}

export function createEvidenceService(db: Database, config: AppConfig) {
  const paths = storagePaths(config.STORAGE_DIR)
  const ready = ensureStorage(paths)
  const context: Context = { db, config, paths, ready }
  return {
    paths,
    ready,
    create: (actor: Actor, ticketId: string, input: CreateEvidenceInput) =>
      createEvidence(context, actor, ticketId, input),
    list: (actor: Actor, ticketId: string) => listEvidence(db, actor, ticketId),
    file: (actor: Actor, evidenceId: string, thumbnail: boolean) =>
      evidenceFile(context, actor, evidenceId, thumbnail),
    findForTus: (evidenceId: string) => findForTus(db, evidenceId),
    markFailed: (evidenceId: string, message: string) =>
      markFailed(db, evidenceId, message),
    complete: (evidenceId: string, data: CompleteData) =>
      complete(db, evidenceId, data),
    quotaForUploader: (actorId: string, excludeId: string) =>
      quotaForUploader(db, actorId, excludeId),
  }
}

export type EvidenceService = ReturnType<typeof createEvidenceService>
