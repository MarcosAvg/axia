import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { runMigrations } from '../../src/db/migrate.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const migration = '0031_remove_external_refs.sql'
const source = fileURLToPath(new URL('../../db/migrations', import.meta.url))
let previous: string

beforeAll(() => {
  previous = mkdtempSync(join(tmpdir(), 'axia-external-refs-'))
  cpSync(source, previous, { recursive: true })
  rmSync(join(previous, migration), { force: true })
})

afterAll(() => rmSync(previous, { recursive: true, force: true }))

async function withOwner<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: ownerConnectionString() })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    'select to_regclass($1) is not null as exists',
    [`public.${table}`],
  )
  return result.rows[0]?.exists === true
}

it('retira las tablas genéricas cuando están vacías', async () => {
  await prepareTestDatabase()
  await withOwner(async (client) => {
    expect(await tableExists(client, 'external_systems')).toBe(false)
    expect(await tableExists(client, 'ticket_external_refs')).toBe(false)
  })
})

it('rechaza el retiro si las tablas conservan filas, sin cambios parciales', async () => {
  await prepareTestDatabase(previous)
  await withOwner(async (client) => {
    await client.query(
      "insert into public.external_systems (name) values ('fixture')",
    )
    await expect(runMigrations(client)).rejects.toThrow(
      /referencias externas.*datos/i,
    )
    expect(await tableExists(client, 'external_systems')).toBe(true)
    expect(await tableExists(client, 'ticket_external_refs')).toBe(true)
    const rows = await client.query<{ count: number }>(
      'select count(*)::int as count from public.external_systems',
    )
    expect(rows.rows[0]?.count).toBe(1)
  })
})

it('rechaza dependencias SQL inesperadas sin borrarlas ni registrar el retiro', async () => {
  await prepareTestDatabase(previous)
  await withOwner(async (client) => {
    await client.query(
      'create view public.fixture_external_view as select name from public.external_systems',
    )
    await expect(runMigrations(client)).rejects.toThrow(
      /cannot drop table external_systems.*depend/i,
    )
    expect(await tableExists(client, 'external_systems')).toBe(true)
    const view = await client.query<{ name: string }>(
      "select to_regclass('public.fixture_external_view') as name",
    )
    expect(view.rows[0]?.name).toBe('fixture_external_view')
    const applied = await client.query<{ name: string }>(
      'select name from axia_migrations.schema_migrations where name = $1',
      [migration],
    )
    expect(applied.rows).toEqual([])
  })
})
