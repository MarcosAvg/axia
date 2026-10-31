import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { ensureAppRole, runMigrations } from '../../src/db/migrate.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const migrations = fileURLToPath(
  new URL('../../db/migrations', import.meta.url),
)
let owner: Client

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
})

it.each(['0000_base.sql', '0016_migration_history.sql'])(
  'rejects edited %s before applying pending application DDL',
  async (filename) => {
    const dir = mkdtempSync(join(tmpdir(), 'axia-integrity-'))
    try {
      cpSync(migrations, dir, { recursive: true })
      const original = join(dir, filename)
      writeFileSync(original, `${readFileSync(original, 'utf8')}\n-- edited\n`)
      writeFileSync(
        join(dir, '9999_pending.sql'),
        'create table must_not_exist (id int);',
      )
      await expect(runMigrations(owner, dir)).rejects.toThrow(
        new RegExp(`checksum.*${filename}`, 'i'),
      )
      const result = await owner.query(
        "select to_regclass('public.must_not_exist') as value",
      )
      expect(result.rows[0]?.value).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  },
)

it('rejects a release missing an already applied migration', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'axia-missing-'))
  try {
    cpSync(migrations, dir, { recursive: true })
    rmSync(join(dir, '0001_grants.sql'))
    await expect(runMigrations(owner, dir)).rejects.toThrow(
      /missing.*0001_grants/i,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

it('adopts pre-checksum history once and preserves the recorded fingerprint', async () => {
  await owner.query(
    "delete from axia_migrations.schema_migrations where name = '0016_migration_history.sql'",
  )
  await owner.query(
    'alter table axia_migrations.schema_migrations drop column if exists checksum',
  )
  await runMigrations(owner)
  const result = await owner.query<{ checksum: string }>(
    "select checksum from axia_migrations.schema_migrations where name = '0000_base.sql'",
  )
  expect(result.rows[0]?.checksum).toMatch(/^[a-f0-9]{64}$/)
  await runMigrations(owner)
  const repeated = await owner.query<{ checksum: string }>(
    "select checksum from axia_migrations.schema_migrations where name = '0000_base.sql'",
  )
  expect(repeated.rows[0]).toEqual(result.rows[0])
})

it('rejects a nonstandard application role before issuing any database query', async () => {
  await expect(
    ensureAppRole({} as Client, { appUser: 'other_role' }),
  ).rejects.toThrow(/axia_app/)
})

it('does not reexecute metadata DDL after adopting checksums', async () => {
  await owner.query(`create function public.reject_unneeded_history_ddl() returns event_trigger
    language plpgsql as $$ begin raise exception 'Applied metadata DDL must not run again'; end $$`)
  await owner.query(`create event trigger reject_history_ddl on ddl_command_start
    when tag in ('ALTER TABLE') execute function public.reject_unneeded_history_ddl()`)
  try {
    await runMigrations(owner)
  } finally {
    await owner.query('drop event trigger reject_history_ddl')
    await owner.query('drop function public.reject_unneeded_history_ddl()')
  }
})
