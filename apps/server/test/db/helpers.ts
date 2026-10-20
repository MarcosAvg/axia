import { Client } from 'pg'

import { ensureAppRole, runMigrations } from '../../src/db/migrate'

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
    await admin.query(
      `drop database if exists ${quoteIdentifier(database)} with (force)`,
    )
    await admin.query(`create database ${quoteIdentifier(database)}`)
  } finally {
    await admin.end()
  }

  const owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
  try {
    await ensureAppRole(owner)
    await runMigrations(owner)
  } finally {
    await owner.end()
  }
}
