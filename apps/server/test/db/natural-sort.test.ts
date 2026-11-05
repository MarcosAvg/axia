import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  appConnectionString,
  ownerConnectionString,
  prepareTestDatabase,
} from './helpers.js'

let owner: Client
let app: Client

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  app = new Client({ connectionString: appConnectionString() })
  await owner.connect()
  await app.connect()
}, 60_000)

afterAll(async () => {
  await app?.end()
  await owner?.end()
})

describe('natural name ordering', () => {
  it('sorts numeric runs as numbers', async () => {
    const result = await owner.query<{ value: string }>(`
      select value
      from (values ('Piso 10'), ('Piso 1'), ('Piso 2'), ('Torre 2 Piso 10'), ('Torre 2 Piso 2')) v(value)
      order by public.natural_sort_key(value)
    `)

    expect(result.rows.map((row) => row.value)).toEqual([
      'Piso 1',
      'Piso 2',
      'Piso 10',
      'Torre 2 Piso 2',
      'Torre 2 Piso 10',
    ])
  })

  it('is executable by the application role', async () => {
    const result = await app.query<{ value: boolean }>(
      "select public.natural_sort_key('Piso 2') < public.natural_sort_key('Piso 10') as value",
    )

    expect(result.rows[0]?.value).toBe(true)
  })
})
