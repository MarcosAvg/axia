import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'

import { ensureAppRole, runMigrations } from '../../src/db/migrate.js'

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../db/migrations', import.meta.url),
)

const APP_USER = process.env.AXIA_APP_USER ?? 'axia_app'

function requiredUrl(): URL {
  const raw = process.env.MIGRATION_DATABASE_URL
  if (!raw) {
    throw new Error('MIGRATION_DATABASE_URL is required for database tests')
  }
  return new URL(raw)
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe database name: ${value}`)
  }
  return `"${value}"`
}

export function ownerConnectionString(): string {
  return requiredUrl().toString()
}

function databaseConnectionString(database: string): string {
  const url = requiredUrl()
  url.pathname = `/${database}`
  url.search = ''
  return url.toString()
}

function migrationFingerprint(): string {
  const content = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map(
      (file) => `${file}\n${readFileSync(join(MIGRATIONS_DIR, file), 'utf8')}`,
    )
    .join('\n')
  return createHash('sha256').update(content).digest('hex').slice(0, 12)
}

async function ensureTemplate(
  admin: Client,
  database: string,
): Promise<string> {
  const template = `${database}_template_${migrationFingerprint()}`
  const exists = await admin.query(
    'select 1 from pg_database where datname = $1',
    [template],
  )
  if (exists.rowCount && exists.rowCount > 0) return template

  await admin.query(`create database ${quoteIdentifier(template)}`)
  const owner = new Client({
    connectionString: databaseConnectionString(template),
  })
  await owner.connect()
  try {
    await ensureAppRole(owner)
    await runMigrations(owner)
  } finally {
    await owner.end()
  }
  return template
}

export function appConnectionString(): string {
  const url = requiredUrl()
  const password = process.env.AXIA_APP_PASSWORD
  if (!password) {
    throw new Error('AXIA_APP_PASSWORD is required for database tests')
  }
  url.username = APP_USER
  url.password = password
  return url.toString()
}

export async function prepareTestDatabase() {
  const target = requiredUrl()
  const database = target.pathname.replace(/^\//, '')
  if (!database.endsWith('_test')) {
    throw new Error('Database tests require a database name ending in _test')
  }

  const maintenance = requiredUrl()
  maintenance.pathname = '/postgres'
  maintenance.search = ''
  const admin = new Client({ connectionString: maintenance.toString() })
  await admin.connect()
  try {
    const template = await ensureTemplate(admin, database)
    await admin.query(
      `drop database if exists ${quoteIdentifier(database)} with (force)`,
    )
    await admin.query(
      `create database ${quoteIdentifier(database)} template ${quoteIdentifier(template)}`,
    )
  } finally {
    await admin.end()
  }
}
