import { describe, expect, it } from 'vitest'

import { createDb, createPool } from '../../src/db/client.js'
import { usesNoTransaction } from '../../src/db/migrate.js'

describe('database pool', () => {
  it('fails fast without a connection string', () => {
    expect(() => createPool('')).toThrow('DATABASE_URL is required')
  })

  it('creates a bounded pool without connecting', async () => {
    const pool = createPool('postgres://axia_app@127.0.0.1:5432/axia')
    expect(pool.options.max).toBe(10)
    expect(pool.options.application_name).toBe('axia')
    await pool.end()
  })

  it('creates a Drizzle client without opening a connection', async () => {
    const { pool, db } = createDb('postgres://axia_app@127.0.0.1:5432/axia')
    expect(db.select).toBeTypeOf('function')
    await pool.end()
  })

  it('detects the no-transaction migration marker', () => {
    expect(usesNoTransaction('-- axia:no-transaction\ncreate index ...')).toBe(
      true,
    )
    expect(usesNoTransaction('-- normal migration\ncreate table ...')).toBe(
      false,
    )
  })
})
