import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

type ItemsBody = { items: Array<Record<string, unknown>> }

let context: TicketHttpContext
let buildingA1: string
let categoryA: string

async function get(path: string, cookie?: string) {
  return context.app.inject({
    method: 'GET',
    url: path,
    headers: authHeaders(cookie),
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  const building = await context.db.execute(
    sql`select id from public.buildings where name = 'Edificio A1'`,
  )
  buildingA1 = (building.rows[0] as { id: string }).id
  const category = await context.db.execute(
    sql`select id from public.categories where name = 'Categoría A'`,
  )
  categoryA = (category.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('catalog reads', () => {
  it('returns simple and priority options', async () => {
    const { cookies } = context
    const teams = await get('/api/catalogs/teams', cookies.requester)
    expect(teams.statusCode).toBe(200)
    expect((teams.json() as ItemsBody).items.map((item) => item.name)).toEqual(
      expect.arrayContaining(['Equipo A', 'Equipo B']),
    )

    const priorities = await get('/api/catalogs/priorities', cookies.requester)
    const media = (priorities.json() as ItemsBody).items.find(
      (item) => item.name === 'Media',
    )
    expect(media).toMatchObject({ name: 'Media', position: 2 })
  })

  it('returns requesters and technicians', async () => {
    const { cookies } = context
    const requesters = await get('/api/catalogs/requesters', cookies.requester)
    const linked = (requesters.json() as ItemsBody).items.find(
      (item) => item.fullName === 'Solicitante vinculado',
    )
    expect(linked?.userId).toBeTruthy()

    const technicians = await get(
      '/api/catalogs/technicians',
      cookies.requester,
    )
    expect(
      (technicians.json() as ItemsBody).items.map((item) => item.fullName),
    ).toEqual(expect.arrayContaining(['Técnico A', 'Técnico B']))
  })
})

describe('dependent catalogs', () => {
  it('returns dependent catalogs and requires their parent', async () => {
    const { cookies } = context
    const locations = await get(
      `/api/catalogs/locations?buildingId=${buildingA1}`,
      cookies.requester,
    )
    expect(locations.statusCode).toBe(200)
    expect(
      (locations.json() as ItemsBody).items.map((item) => item.name),
    ).toContain('Sala A1')

    const missingBuilding = await get(
      '/api/catalogs/locations',
      cookies.requester,
    )
    expect(missingBuilding.statusCode).toBe(400)

    const subcategories = await get(
      `/api/catalogs/subcategories?categoryId=${categoryA}`,
      cookies.requester,
    )
    expect(subcategories.statusCode).toBe(200)

    const missingCategory = await get(
      '/api/catalogs/subcategories',
      cookies.requester,
    )
    expect(missingCategory.statusCode).toBe(400)
  })
})

describe('catalog validation and access', () => {
  it('returns reasons by use', async () => {
    const response = await get(
      '/api/catalogs/reasons?use=pause',
      context.cookies.requester,
    )
    expect(response.statusCode).toBe(200)
    expect((response.json() as ItemsBody).items).toEqual(expect.any(Array))

    const missingUse = await get(
      '/api/catalogs/reasons',
      context.cookies.requester,
    )
    expect(missingUse.statusCode).toBe(400)
  })

  it('rejects unknown catalogs and actors without ticket.view', async () => {
    const unknown = await get(
      '/api/catalogs/unknown',
      context.cookies.requester,
    )
    expect(unknown.statusCode).toBe(400)

    const forbidden = await get('/api/catalogs/teams', context.cookies.noAccess)
    expect(forbidden.statusCode).toBe(403)
  })
})
