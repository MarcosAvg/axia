import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import type { StoragePaths } from './paths.js'

const BATCH_SIZE = 500

/**
 * Las filas de evidencia no se borran nunca (RN-22). Si una subida quedó
 * abandonada, se eliminan sus archivos parciales y la fila se marca `failed`.
 */
export async function cleanupPendingEvidence(
  db: Database,
  paths: StoragePaths,
  olderThanHours = 24,
): Promise<{ rows: number }> {
  const result = await db.execute(sql`
    select id
    from public.evidence
    where processing_state = 'pending'
      and storage_path is null
      and created_at < now() - ${olderThanHours} * interval '1 hour'
    order by created_at
    limit ${BATCH_SIZE}
  `)
  const ids = (result.rows as Array<{ id: string }>).map((row) => row.id)
  if (ids.length === 0) return { rows: 0 }

  await Promise.all(
    ids.flatMap((id) => [
      rm(join(paths.uploads, id), { force: true }),
      rm(join(paths.uploads, `${id}.json`), { force: true }),
    ]),
  )

  const list = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  await db.execute(sql`
    update public.evidence
    set
      processing_state = 'failed',
      processing_error = 'Subida abandonada',
      processed_at = now()
    where id in (${list})
  `)

  return { rows: ids.length }
}
