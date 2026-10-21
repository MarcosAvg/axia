import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { Client } from 'pg'

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../db/migrations', import.meta.url),
)
const MIGRATION_LOCK_KEY = 1_096_112_449 // "AXIA"
// A no-transaction migration must be idempotent and contain one statement:
// CREATE INDEX CONCURRENTLY, VACUUM, REINDEX CONCURRENTLY, etc.
const NO_TRANSACTION_MARKER = /^\s*--\s*axia:no-transaction\s*$/m

export type MigrationOptions = {
  appUser?: string
  appPassword?: string
}

export function usesNoTransaction(sql: string): boolean {
  return NO_TRANSACTION_MARKER.test(sql)
}

async function createAppRole(
  client: Client,
  appUser: string,
  appPassword: string,
) {
  const statement = await client.query<{ sql: string }>(
    `select format(
      'create role %I login password %L nosuperuser nocreatedb nocreaterole noreplication nobypassrls',
      $1::text,
      $2::text
    ) as sql`,
    [appUser, appPassword],
  )
  const sql = statement.rows[0]?.sql
  if (!sql) {
    throw new Error('Could not build the application role statement')
  }

  await client.query(sql)
}

export async function ensureAppRole(
  client: Client,
  options: MigrationOptions = {},
) {
  const appUser = options.appUser ?? process.env.AXIA_APP_USER ?? 'axia_app'
  const appPassword = options.appPassword ?? process.env.AXIA_APP_PASSWORD

  const existing = await client.query<{ rolcanlogin: boolean }>(
    'select rolcanlogin from pg_roles where rolname = $1',
    [appUser],
  )

  if (existing.rowCount === 0) {
    if (!appPassword) {
      throw new Error(
        `Role ${appUser} does not exist; set AXIA_APP_PASSWORD to create it`,
      )
    }
    await createAppRole(client, appUser, appPassword)
    return
  }

  if (!existing.rows[0]?.rolcanlogin) {
    throw new Error(`Role ${appUser} exists but cannot log in`)
  }
}

async function recordMigration(client: Client, file: string) {
  await client.query(
    'insert into axia_migrations.schema_migrations (name) values ($1)',
    [file],
  )
}

async function applyMigration(client: Client, file: string, sql: string) {
  if (usesNoTransaction(sql)) {
    try {
      await client.query(sql)
      await recordMigration(client, file)
    } catch (error) {
      throw new Error(
        `Migration ${file} failed (no transaction): ${error instanceof Error ? error.message : error}`,
      )
    }
    console.log(`Applied ${file} (no transaction)`)
    return
  }

  await client.query('begin')
  try {
    await client.query(sql)
    await recordMigration(client, file)
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw new Error(
      `Migration ${file} failed: ${error instanceof Error ? error.message : error}`,
    )
  }

  console.log(`Applied ${file}`)
}

export async function runMigrations(
  client: Client,
  migrationsDir = MIGRATIONS_DIR,
) {
  await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_KEY])

  try {
    await client.query('create schema if not exists axia_migrations')
    await client.query(`
      create table if not exists axia_migrations.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `)

    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const alreadyApplied = await client.query(
        'select 1 from axia_migrations.schema_migrations where name = $1',
        [file],
      )

      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        continue
      }

      await applyMigration(
        client,
        file,
        readFileSync(join(migrationsDir, file), 'utf8'),
      )
    }
  } finally {
    await client.query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
  }
}

export async function migrateFromEnvironment() {
  const connectionString = process.env.MIGRATION_DATABASE_URL
  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL is required')
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    await ensureAppRole(client)
    await runMigrations(client)
  } finally {
    await client.end()
  }
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  migrateFromEnvironment().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
