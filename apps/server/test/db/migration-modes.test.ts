import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runMigrations } from '../../src/db/migrate.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let owner: Client

async function scalar(client: Client, sql: string): Promise<number> {
  const result = await client.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
})

describe('migration modes', () => {
  it('runs concurrent index creation outside a transaction', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'axia-migrations-'))
    const names = [
      '0001_no_tx_table.sql',
      '0002_no_tx_index.sql',
      '0003_tx_table.sql',
    ]

    try {
      writeFileSync(
        join(dir, names[0]!),
        '-- axia:no-transaction\ncreate table if not exists public.migration_no_tx (id integer);',
      )
      writeFileSync(
        join(dir, names[1]!),
        '-- axia:no-transaction\ncreate index concurrently if not exists migration_no_tx_id_idx on public.migration_no_tx (id);',
      )
      writeFileSync(
        join(dir, names[2]!),
        'create table if not exists public.migration_tx (id integer);',
      )

      await runMigrations(owner, dir)

      expect(
        await scalar(
          owner,
          "select count(*)::text as value from pg_tables where schemaname = 'public' and tablename in ('migration_no_tx', 'migration_tx')",
        ),
      ).toBe(2)
      expect(
        await scalar(
          owner,
          "select count(*)::text as value from pg_indexes where schemaname = 'public' and indexname = 'migration_no_tx_id_idx'",
        ),
      ).toBe(1)
      expect(
        await scalar(
          owner,
          "select count(*)::text as value from axia_migrations.schema_migrations where name in ('0001_no_tx_table.sql', '0002_no_tx_index.sql', '0003_tx_table.sql')",
        ),
      ).toBe(3)
    } finally {
      await owner.query(
        'drop table if exists public.migration_no_tx, public.migration_tx',
      )
      await owner.query(
        "delete from axia_migrations.schema_migrations where name in ('0001_no_tx_table.sql', '0002_no_tx_index.sql', '0003_tx_table.sql')",
      )
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
