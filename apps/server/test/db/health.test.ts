import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { checkDatabase } from '../../src/db/health.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let goodPool: Pool
let badPool: Pool

beforeAll(async () => {
  await prepareTestDatabase()
  goodPool = new Pool({ connectionString: ownerConnectionString(), max: 1 })
  badPool = new Pool({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:1/axia_test',
    max: 1,
    connectionTimeoutMillis: 200,
  })
}, 60_000)

afterAll(async () => {
  await goodPool?.end()
  await badPool?.end()
})

describe('database health', () => {
  it('passes against the real test database', async () => {
    await expect(checkDatabase(goodPool, 2_000)).resolves.toBeUndefined()
  })

  it('fails clearly when the database is unreachable', async () => {
    await expect(checkDatabase(badPool, 500)).rejects.toThrow()
  })
})
