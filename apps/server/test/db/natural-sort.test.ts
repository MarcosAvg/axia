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

describe('natural name ordering edge cases', () => {
  it('keeps nulls last', async () => {
    const result = await owner.query<{ value: string | null }>(`
      select value from (values ('b'), (null), ('a')) v(value)
      order by public.natural_sort_key(value)
    `)

    expect(result.rows.map((row) => row.value)).toEqual(['a', 'b', null])
  })

  it('treats leading zeros as the same number', async () => {
    const result = await owner.query<{ same: boolean; before: boolean }>(`
      select
        public.natural_sort_key('Piso 2') = public.natural_sort_key('Piso 02') as same,
        public.natural_sort_key('Piso 02') < public.natural_sort_key('Piso 10') as before
    `)

    expect(result.rows[0]).toEqual({ same: true, before: true })
  })

  it('preserves the collation for alphabetic runs', async () => {
    const result = await owner.query<{ same: boolean }>(`
      select
        (select array_agg(value order by public.natural_sort_key(value))
         from (values ('Ático'), ('Anexo'), ('Ñandú'), ('Naranja'), ('bodega')) v(value))
        =
        (select array_agg(value order by value)
         from (values ('Ático'), ('Anexo'), ('Ñandú'), ('Naranja'), ('bodega')) v(value))
        as same
    `)

    expect(result.rows[0]?.same).toBe(true)
  })

  it('orders runs at the twenty-digit boundary', async () => {
    const result = await owner.query<{ value: string }>(`
      select value
      from (values ('Piso 10000000000000000000'), ('Piso 9999999999999999999')) v(value)
      order by public.natural_sort_key(value)
    `)

    expect(result.rows.map((row) => row.value)).toEqual([
      'Piso 9999999999999999999',
      'Piso 10000000000000000000',
    ])
  })

  it('does not allow public execution', async () => {
    const result = await owner.query<{ allowed: boolean }>(
      "select has_function_privilege('public', 'public.natural_sort_key(text)', 'execute') as allowed",
    )

    expect(result.rows[0]?.allowed).toBe(false)
  })
})
