import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

export function createPool(connectionString = process.env.DATABASE_URL): Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  return new Pool({
    connectionString,
    application_name: 'axia',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

export function createDb(connectionString?: string) {
  const pool = createPool(connectionString)
  const db = drizzle(pool, { schema })

  return { pool, db }
}
