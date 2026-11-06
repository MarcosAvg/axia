import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { ensureStorage, storagePaths } from '../evidence/paths.js'
import { createAttachment } from './create.js'
import type { CreateAttachmentInput } from './schemas.js'

export type AttachmentRow = {
  id: string
  ticket_id: string | null
  problem_id: string
  client_request_id: string
  uploaded_by: string
  original_name: string
  declared_mime_type: string | null
  mime_type: string | null
  size_bytes: string | number | null
  sha256: string | null
  storage_path: string | null
  processing_state: string
  processing_error: string | null
  created_at: Date | string
  linked_at: Date | string | null
}

export type CompleteAttachmentData = {
  storagePath: string
  mimeType: string
  sizeBytes: number
  sha256: string
}

type Context = {
  db: Database
  config: AppConfig
  paths: ReturnType<typeof attachmentPaths>
  ready: Promise<void>
}

function attachmentPaths(root: string) {
  const base = storagePaths(root)
  return {
    root: base.root,
    uploads: join(base.uploads, 'attachments'),
    files: join(base.files, 'attachments'),
  }
}

async function findForTus(
  db: Database,
  attachmentId: string,
): Promise<AttachmentRow | null> {
  const result = await db.execute(sql`
    select * from public.ticket_attachments where id = ${attachmentId} limit 1
  `)
  return (result.rows[0] as AttachmentRow | undefined) ?? null
}

async function markFailed(db: Database, attachmentId: string, message: string) {
  await db.execute(sql`
    update public.ticket_attachments
    set
      processing_state = 'failed',
      processing_error = ${message.slice(0, 1000)}
    where id = ${attachmentId}
  `)
}

async function complete(
  db: Database,
  attachmentId: string,
  data: CompleteAttachmentData,
) {
  await db.execute(sql`
    update public.ticket_attachments
    set
      storage_path = ${data.storagePath},
      mime_type = ${data.mimeType},
      size_bytes = ${data.sizeBytes},
      sha256 = ${data.sha256},
      processing_state = 'ready',
      processing_error = null
    where id = ${attachmentId}
  `)
}

async function quotaForUploader(
  db: Database,
  actorId: string,
  excludeId: string,
): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(sum(size_bytes), 0)::bigint as used
    from public.ticket_attachments
    where uploaded_by = ${actorId}
      and processing_state = 'ready'
      and id <> ${excludeId}
  `)
  return Number(
    (result.rows[0] as { used: string | number } | undefined)?.used ?? 0,
  )
}

export function createAttachmentService(db: Database, config: AppConfig) {
  const paths = attachmentPaths(config.STORAGE_DIR)
  const ready = (async () => {
    await ensureStorage(storagePaths(config.STORAGE_DIR))
    await mkdir(paths.uploads, { recursive: true })
    await mkdir(paths.files, { recursive: true })
  })()
  const context: Context = { db, config, paths, ready }
  return {
    paths,
    ready,
    create: (actor: Actor, input: CreateAttachmentInput) =>
      createAttachment(context, actor, input),
    findForTus: (attachmentId: string) => findForTus(db, attachmentId),
    markFailed: (attachmentId: string, message: string) =>
      markFailed(db, attachmentId, message),
    complete: (attachmentId: string, data: CompleteAttachmentData) =>
      complete(db, attachmentId, data),
    quotaForUploader: (actorId: string, excludeId: string) =>
      quotaForUploader(db, actorId, excludeId),
  }
}

export type AttachmentService = ReturnType<typeof createAttachmentService>
