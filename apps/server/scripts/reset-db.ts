import { Client } from 'pg'

import { ensureAppRole, runMigrations } from '../src/db/migrate'

function assertLocal(databaseUrl: string) {
  const url = new URL(databaseUrl)
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('db:reset only runs against a local PostgreSQL host')
  }
}

async function main() {
  const connectionString = process.env.MIGRATION_DATABASE_URL
  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL is required')
  }

  assertLocal(connectionString)

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const database = await client.query<{ current_database: string }>(
      'select current_database()',
    )
    const name = database.rows[0]?.current_database
    if (!name) {
      throw new Error('Could not determine the current database')
    }

    console.log(`Resetting public schema of ${name}`)
    await client.query('drop schema if exists public cascade')
    await client.query('create schema public')
    await client.query('drop schema if exists axia_migrations cascade')

    await ensureAppRole(client)
    await runMigrations(client)
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
