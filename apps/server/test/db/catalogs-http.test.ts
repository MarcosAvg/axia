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
let buildingB1: string
let categoryA: string
let dependencyOnlyA1: string

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
  const otherBuilding = await context.db.execute(
    sql`select id from public.buildings where name = 'Edificio B1'`,
  )
  buildingB1 = (otherBuilding.rows[0] as { id: string }).id
  const category = await context.db.execute(
    sql`select id from public.categories where name = 'Categoría A'`,
  )
  categoryA = (category.rows[0] as { id: string }).id
  const dependency = await context.db.execute(sql`
    insert into public.dependencies (name)
    values ('Dependencia solo A1') returning id
  `)
  dependencyOnlyA1 = (dependency.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.dependency_locations (dependency_id, location_id)
    values (
      ${dependencyOnlyA1},
      (select id from public.locations where name = 'Sala A1')
    )
  `)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('catalog ordering', () => {
  it('orders locations by the number inside the name', async () => {
    const building = await context.db.execute(sql`
      insert into public.buildings (name)
      values ('Edificio orden natural') returning id
    `)
    const buildingId = (building.rows[0] as { id: string }).id
    const locationIds: string[] = []
    for (const name of ['Piso 10', 'Piso 2', 'Piso 1']) {
      const location = await context.db.execute(sql`
        insert into public.locations (building_id, name)
        values (${buildingId}, ${name})
        returning id
      `)
      locationIds.push((location.rows[0] as { id: string }).id)
    }
    const dependency = await context.db.execute(sql`
      insert into public.dependencies (name)
      values ('Dependencia orden natural') returning id
    `)
    const dependencyId = (dependency.rows[0] as { id: string }).id
    for (const locationId of locationIds) {
      await context.db.execute(sql`
        insert into public.dependency_locations (dependency_id, location_id)
        values (${dependencyId}, ${locationId})
      `)
    }

    const response = await get(
      `/api/catalogs/locations?buildingId=${buildingId}`,
      context.cookies.requester,
    )
    const scoped = await get(
      `/api/catalogs/locations?buildingId=${buildingId}&dependencyId=${dependencyId}`,
      context.cookies.requester,
    )

    expect(response.statusCode).toBe(200)
    expect(
      (response.json() as ItemsBody).items.map((item) => item.name),
    ).toEqual(['Piso 1', 'Piso 2', 'Piso 10'])
    expect(scoped.statusCode).toBe(200)
    expect((scoped.json() as ItemsBody).items.map((item) => item.name)).toEqual(
      ['Piso 1', 'Piso 2', 'Piso 10'],
    )
  })
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
    expect(media).toMatchObject({ name: 'Media', position: 3 })
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
  it('lists only buildings with locations linked to the dependency', async () => {
    const buildings = await get(
      `/api/catalogs/buildings?dependencyId=${dependencyOnlyA1}`,
      context.cookies.requester,
    )
    expect(buildings.statusCode).toBe(200)
    expect(
      (buildings.json() as ItemsBody).items.map((item) => item.name),
    ).toEqual(['Edificio A1'])
  })

  it('lists only locations linked to the dependency inside the building', async () => {
    const locations = await get(
      `/api/catalogs/locations?buildingId=${buildingA1}&dependencyId=${dependencyOnlyA1}`,
      context.cookies.requester,
    )
    expect(locations.statusCode).toBe(200)
    expect(
      (locations.json() as ItemsBody).items.map((item) => item.name),
    ).toEqual(['Sala A1'])

    const otherBuilding = await get(
      `/api/catalogs/locations?buildingId=${buildingB1}&dependencyId=${dependencyOnlyA1}`,
      context.cookies.requester,
    )
    expect(otherBuilding.statusCode).toBe(200)
    expect((otherBuilding.json() as ItemsBody).items).toEqual([])
  })

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
