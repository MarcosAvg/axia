import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let linkedDependency: string
let otherDependency: string
let unlinkedDependency: string
let locationA2: string
let locationB1: string

async function request(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  cookie: string,
  payload?: Record<string, unknown>,
) {
  return context.app.inject({
    method,
    url,
    headers: authHeaders(cookie),
    payload,
  })
}

function ticketBody(dependencyId: string, locationId: string) {
  return {
    buildingId: refs.buildingId,
    locationId,
    dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: 'Prueba de dependencia por ubicación',
    requesterId: refs.requesterId,
    requesterContact: 'Ext. 123',
    clientRequestId: randomUUID(),
  }
}

async function insertDependency(
  name: string,
  locationIds: string[],
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.dependencies (name) values (${name}) returning id
  `)
  const id = (result.rows[0] as { id: string }).id
  for (const locationId of locationIds) {
    await context.db.execute(sql`
      insert into public.dependency_locations (dependency_id, location_id)
      values (${id}, ${locationId})
    `)
  }
  return id
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const places = await context.db.execute(sql`
    select
      (select id from public.locations where name = 'Sala A2') as a2,
      (select id from public.locations where name = 'Sala B1') as b1
  `)
  const row = places.rows[0] as { a2: string; b1: string }
  locationA2 = row.a2
  locationB1 = row.b1
  linkedDependency = await insertDependency('Dependencia vinculada', [
    refs.locationId,
  ])
  otherDependency = await insertDependency('Dependencia de otra sede', [
    locationB1,
  ])
  unlinkedDependency = await insertDependency('Dependencia sin ubicación', [])
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('catálogo de dependencias por ubicación', () => {
  it('ofrece solo las vinculadas y oculta las de otra ubicación o sin vínculos', async () => {
    const response = await request(
      'GET',
      `/api/catalogs/dependencies?locationId=${refs.locationId}`,
      context.cookies.requester,
    )
    expect(response.statusCode).toBe(200)
    const names = (response.json() as { items: { name: string }[] }).items.map(
      (item) => item.name,
    )
    expect(names).toEqual(
      expect.arrayContaining(['Dependencia', 'Dependencia vinculada']),
    )
    expect(names).not.toContain('Dependencia de otra sede')
    expect(names).not.toContain('Dependencia sin ubicación')
  })
})

describe('administración de dependencias', () => {
  it('actualiza la dependencia y reemplaza sus ubicaciones', async () => {
    const url = `/api/admin/catalogs/dependencies/${linkedDependency}`
    const locationIds = [refs.locationId, locationA2]
    const saved = await request('PATCH', url, context.cookies.admin, {
      name: 'Dependencia vinculada',
      active: true,
      locationIds,
    })
    expect(saved.statusCode).toBe(204)

    const loaded = await request(
      'GET',
      `${url}/locations`,
      context.cookies.admin,
    )
    expect(loaded.statusCode).toBe(200)
    expect((loaded.json() as { locationIds: string[] }).locationIds).toEqual(
      expect.arrayContaining(locationIds),
    )
  })

  it('crea una dependencia con al menos una ubicación', async () => {
    const response = await request(
      'POST',
      '/api/admin/catalogs/dependencies',
      context.cookies.admin,
      {
        name: 'Dependencia nueva',
        active: true,
        locationIds: [refs.locationId],
      },
    )
    expect(response.statusCode).toBe(201)
    const id = (response.json() as { id: string }).id
    const links = await request(
      'GET',
      `/api/admin/catalogs/dependencies/${id}/locations`,
      context.cookies.admin,
    )
    expect((links.json() as { locationIds: string[] }).locationIds).toEqual([
      refs.locationId,
    ])
  })
})

describe('validación de dependencias', () => {
  it('rechaza una dependencia sin ubicaciones', async () => {
    const response = await request(
      'POST',
      '/api/admin/catalogs/dependencies',
      context.cookies.admin,
      { name: 'Dependencia vacía', active: true, locationIds: [] },
    )
    expect(response.statusCode).toBe(400)
  })

  it('exige catalog.manage', async () => {
    const response = await request(
      'PATCH',
      `/api/admin/catalogs/dependencies/${linkedDependency}`,
      context.cookies.requester,
      {
        name: 'Intento',
        active: true,
        locationIds: [refs.locationId],
      },
    )
    expect(response.statusCode).toBe(403)
  })
})

describe('alta con dependencia vinculada', () => {
  it('rechaza una dependencia vinculada a otra ubicación', async () => {
    const response = await request(
      'POST',
      '/api/tickets',
      context.cookies.admin,
      ticketBody(otherDependency, refs.locationId),
    )
    expect(response.statusCode).toBe(400)
  })

  it('acepta una dependencia vinculada a la ubicación', async () => {
    const response = await request(
      'POST',
      '/api/tickets',
      context.cookies.admin,
      ticketBody(linkedDependency, refs.locationId),
    )
    expect(response.statusCode).toBe(201)
  })

  it('rechaza una dependencia sin ubicaciones', async () => {
    const response = await request(
      'POST',
      '/api/tickets',
      context.cookies.admin,
      ticketBody(unlinkedDependency, refs.locationId),
    )
    expect(response.statusCode).toBe(400)
  })
})
