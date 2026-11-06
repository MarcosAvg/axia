import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { resolveStored, storagePaths } from '../evidence/paths.js'
import type { AttachmentStoragePaths } from './paths.js'

const BATCH_SIZE = 500

type PendingRow = {
  id: string
  storage_path: string | null
}

/**
 * Los adjuntos ligados son historial y no se borran. Las preparaciones que
 * nunca se ligaron (pendientes o ya procesadas) se marcan `failed` y se les
 * retiran los archivos.
 */
export async function cleanupPendingAttachments(
  db: Database,
  paths: AttachmentStoragePaths,
  olderThanHours = 24,
): Promise<{ rows: number }> {
  const result = await db.execute(sql`
    select id, storage_path
    from public.ticket_attachments
    where ticket_id is null
      and created_at < now() - ${olderThanHours} * interval '1 hour'
    order by created_at
    limit ${BATCH_SIZE}
  `)
  const rows = result.rows as PendingRow[]
  if (rows.length === 0) return { rows: 0 }

  const root = storagePaths(paths.root)
  await Promise.all(
    rows.flatMap((row) => {
      const files = [
        rm(join(paths.uploads, row.id), { force: true }),
        rm(join(paths.uploads, `${row.id}.json`), { force: true }),
      ]
      if (row.storage_path) {
        files.push(rm(resolveStored(root, row.storage_path), { force: true }))
      }
      return files
    }),
  )

  const list = sql.join(
    rows.map((row) => sql`${row.id}`),
    sql`, `,
  )
  await db.execute(sql`
    update public.ticket_attachments
    set
      processing_state = 'failed',
      processing_error = 'Subida abandonada'
    where id in (${list})
  `)

  return { rows: rows.length }
}
