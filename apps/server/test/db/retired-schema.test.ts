import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { runMigrations } from '../../src/db/migrate.js'
import { seedDemo } from '../../src/db/seed-demo/index.js'
import {
  appConnectionString,
  ownerConnectionString,
  prepareTestDatabase,
} from './helpers.js'
import { retiredFixtures, retiredTables } from './retired-schema-fixtures.js'

const migration = '0017_remove_retired_objects.sql'
const externalMigration = '0031_remove_external_refs.sql'
const source = fileURLToPath(new URL('../../db/migrations', import.meta.url))
let previous: string
let upgrade: string
let owner: Client

beforeAll(() => {
  previous = mkdtempSync(join(tmpdir(), 'axia-previous-schema-'))
  cpSync(source, previous, { recursive: true })
  rmSync(join(previous, migration), { force: true })
  // La retirada de referencias externas se prueba en external-refs-removal.test.ts.
  rmSync(join(previous, externalMigration), { force: true })
  upgrade = mkdtempSync(join(tmpdir(), 'axia-upgrade-schema-'))
  cpSync(source, upgrade, { recursive: true })
  rmSync(join(upgrade, externalMigration), { force: true })
})

beforeEach(async () => {
  await prepareTestDatabase(previous)
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
  await seedDemo(owner, {
    password: 'FixturePassword123!',
    evidenceDir: join(previous, 'evidence'),
  })
  await owner.query(
    "insert into public.external_systems (name) values ('fixture')",
  )
  await owner.query(`
    insert into public.ticket_external_refs (ticket_id, system, external_id)
    select id, 'fixture', 'external-1' from public.tickets order by id limit 1
  `)
}, 60_000)

afterEach(async () => owner?.end())
afterAll(() => {
  rmSync(previous, { recursive: true, force: true })
  rmSync(upgrade, { recursive: true, force: true })
})

async function objects() {
  const result = await owner.query<{ name: string }>(`
    select tablename as name from pg_tables where schemaname = 'public'
  `)
  return result.rows.map((row) => row.name)
}

async function snapshot() {
  const result = await owner.query(`
    select
      (select jsonb_agg(t order by id) from public.tickets t) as tickets,
      (select jsonb_agg(e order by id) from public.ticket_events e) as events,
      (select jsonb_agg(u order by id) from public.users u) as users,
      (select jsonb_agg(r order by id) from public.ticket_external_refs r) as refs,
      (select jsonb_agg(m order by name) from axia_migrations.schema_migrations m) as history
  `)
  return result.rows[0]!
}

it('actualiza 0016 sin alterar cuentas, tiquets, eventos, referencias ni huellas existentes', async () => {
  const before = await snapshot()
  await runMigrations(owner, upgrade)
  const after = await snapshot()
  expect(after).toMatchObject({
    ...before,
    history: expect.arrayContaining(before.history),
  })
  expect(after.history).toHaveLength(before.history.length + 1)
  expect(
    (await objects()).filter((name) => retiredTables.includes(name)),
  ).toEqual([])
  const functions = await owner.query<{ proname: string }>(`
    select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and proname like 'metrics_%'
  `)
  expect(functions.rows).toEqual([{ proname: 'metrics_date_in' }])
  await runMigrations(owner, upgrade)
  expect(await snapshot()).toEqual(after)
})

it.each(retiredFixtures)(
  'rechaza el retiro si $table conserva filas, sin cambios parciales',
  async ({ table, insert }) => {
    await owner.query(insert)
    const before = await snapshot()
    await expect(runMigrations(owner, upgrade)).rejects.toThrow(
      /tablas históricas.*datos/i,
    )
    expect(await snapshot()).toEqual(before)
    expect(
      (await objects()).filter((name) => retiredTables.includes(name)).sort(),
    ).toEqual([...retiredTables].sort())
    const result = await owner.query(
      `select count(*)::int as count from public.${table}`,
    )
    expect(result.rows[0]?.count).toBeGreaterThan(0)
  },
)

it('rechaza dependencias SQL inesperadas sin borrarlas ni registrar el retiro', async () => {
  await owner.query(
    'create view public.fixture_import_view as select id from public.import_batches',
  )
  const before = await snapshot()
  await expect(runMigrations(owner, upgrade)).rejects.toThrow(
    /cannot drop table import_batches.*depend/i,
  )
  expect(await snapshot()).toEqual(before)
  expect(await objects()).toEqual(expect.arrayContaining(retiredTables))
  const result = await owner.query(
    "select to_regclass('public.fixture_import_view') as name",
  )
  expect(result.rows[0]?.name).toBe('fixture_import_view')
})

it('conserva una fila confirmada mientras la migración espera un escritor concurrente', async () => {
  const writer = new Client({ connectionString: ownerConnectionString() })
  await writer.connect()
  const pid = await owner.query<{ pid: number }>(
    'select pg_backend_pid() as pid',
  )
  let attempt: Promise<unknown> | undefined
  try {
    await writer.query('begin')
    await writer.query(retiredFixtures[0]!.insert)
    attempt = runMigrations(owner, upgrade).then(
      () => null,
      (error: unknown) => error,
    )
    await vi.waitFor(
      async () => {
        const waiting = await writer.query<{ blocked: boolean }>(
          'select cardinality(pg_blocking_pids($1::int)) > 0 as blocked',
          [pid.rows[0]!.pid],
        )
        expect(waiting.rows[0]?.blocked).toBe(true)
      },
      { timeout: 3_000, interval: 20 },
    )
    await writer.query('commit')
    expect(await attempt).toBeInstanceOf(Error)
    const rows = await writer.query(
      'select count(*)::int as count from public.catalog_aliases',
    )
    expect(rows.rows[0]?.count).toBe(1)
    const applied = await writer.query(
      'select name from axia_migrations.schema_migrations where name = $1',
      [migration],
    )
    expect(applied.rows).toEqual([])
  } finally {
    await writer.query('rollback')
    await attempt
    await writer.end()
  }
})

it('conserva referencias externas y límites de escritura del rol de aplicación', async () => {
  await runMigrations(owner, upgrade)
  const app = new Client({ connectionString: appConnectionString() })
  await app.connect()
  try {
    const refs = await app.query('select * from public.ticket_external_refs')
    expect(refs.rows).toHaveLength(1)
    await expect(
      app.query(
        "insert into public.ticket_external_refs (ticket_id, system, external_id) select id, 'missing', 'other' from public.tickets limit 1",
      ),
    ).rejects.toMatchObject({ code: '23503' })
    await expect(
      app.query('update public.ticket_events set cycle = cycle'),
    ).rejects.toMatchObject({ code: '42501' })
    await expect(
      app.query('create table forbidden (id int)'),
    ).rejects.toMatchObject({ code: '42501' })
    const helper = await app.query(
      'select public.metrics_date_in(now(), null, null) as visible',
    )
    expect(helper.rows[0]?.visible).toBe(true)
  } finally {
    await app.end()
  }
})
