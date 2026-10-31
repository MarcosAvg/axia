import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Client } from 'pg'

export type MigrationSource = { name: string; sql: string; checksum: string }

export function readMigrationSources(directory: string): MigrationSource[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(directory, name), 'utf8')
      return {
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      }
    })
}

export async function ensureHistoryChecksums(
  client: Client,
  sources: MigrationSource[],
) {
  const column = await client.query<{ exists: boolean }>(`select exists (
    select 1 from information_schema.columns where table_schema = 'axia_migrations'
    and table_name = 'schema_migrations' and column_name = 'checksum'
  ) as exists`)
  if (column.rows[0]?.exists) return
  const recorded = await client.query(
    'select 1 from axia_migrations.schema_migrations where name = $1',
    ['0016_migration_history.sql'],
  )
  if (recorded.rowCount)
    throw new Error(
      'Migration checksum column is missing from an upgraded history',
    )
  const bootstrap = sources.find(
    (source) => source.name === '0016_migration_history.sql',
  )
  if (!bootstrap)
    throw new Error('Missing metadata migration: 0016_migration_history.sql')
  await client.query(bootstrap.sql)
}

export async function verifyMigrationHistory(
  client: Client,
  sources: MigrationSource[],
) {
  const history = await client.query<{ name: string; checksum: string | null }>(
    'select name, checksum from axia_migrations.schema_migrations',
  )
  const available = new Map(sources.map((source) => [source.name, source]))
  for (const row of history.rows) {
    const source = available.get(row.name)
    if (!source) throw new Error(`Missing applied migration: ${row.name}`)
    if (row.checksum !== null && row.checksum !== source.checksum) {
      throw new Error(`Checksum mismatch for applied migration: ${row.name}`)
    }
  }
  // Legacy history has no fingerprints. Adopt once after validating every
  // existing fingerprint; this cannot detect changes made before adoption.
  for (const row of history.rows) {
    if (row.checksum !== null) continue
    await client.query(
      'update axia_migrations.schema_migrations set checksum = $2 where name = $1 and checksum is null',
      [row.name, available.get(row.name)!.checksum],
    )
  }
  return new Set(history.rows.map((row) => row.name))
}
