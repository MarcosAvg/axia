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
let locationA2: string
let locationB1: string

async function get(url: string, cookie: string) {
  return context.app.inject({
    method: 'GET',
    url,
    headers: authHeaders(cookie),
  })
}

async function put(
  url: string,
  cookie: string,
  payload: Record<string, unknown>,
) {
  return context.app.inject({
    method: 'PUT',
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
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: 'Prueba de dependencia por ubicación',
    requesterId: refs.requesterId,
    requesterContact: 'Ext. 123',
    clientRequestId: randomUUID(),
  }
}

async function post(cookie: string, payload: Record<string, unknown>) {
  return context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload,
  })
}

async function insertDependency(name: string, locationId: string) {
  const result = await context.db.execute(sql`
    insert into public.dependencies (name) values (${name}) returning id
  `)
  const id = (result.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.dependency_locations (dependency_id, location_id)
    values (${id}, ${locationId})
  `)
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
  linkedDependency = await insertDependency(
    'Dependencia vinculada',
    refs.locationId,
  )
  otherDependency = await insertDependency(
    'Dependencia de otra sede',
    locationB1,
  )
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('catálogo de dependencias por ubicación', () => {
  it('ofrece las vinculadas y las de respaldo, y oculta las de otra ubicación', async () => {
    const response = await get(
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
  })
})

describe('administración de ubicaciones de una dependencia', () => {
  it('reemplaza y devuelve los vínculos', async () => {
    const url = `/api/admin/catalogs/dependencies/${linkedDependency}/locations`
    const locationIds = [refs.locationId, locationA2]
    const saved = await put(url, context.cookies.admin, { locationIds })
    expect(saved.statusCode).toBe(204)

    const loaded = await get(url, context.cookies.admin)
    expect(loaded.statusCode).toBe(200)
    expect((loaded.json() as { locationIds: string[] }).locationIds).toEqual(
      expect.arrayContaining(locationIds),
    )

    const all = await get(
      '/api/admin/catalogs/dependencies/locations',
      context.cookies.admin,
    )
    expect((all.json() as { items: { dependencyId: string }[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dependencyId: linkedDependency }),
      ]),
    )
  })

  it('exige catalog.manage', async () => {
    const response = await put(
      `/api/admin/catalogs/dependencies/${linkedDependency}/locations`,
      context.cookies.requester,
      { locationIds: [] },
    )
    expect(response.statusCode).toBe(403)
  })
})

describe('alta con dependencia vinculada', () => {
  it('rechaza una dependencia vinculada a otra ubicación', async () => {
    const response = await post(
      context.cookies.admin,
      ticketBody(otherDependency, refs.locationId),
    )
    expect(response.statusCode).toBe(400)
  })

  it('acepta una dependencia vinculada a la ubicación', async () => {
    const response = await post(
      context.cookies.admin,
      ticketBody(linkedDependency, refs.locationId),
    )
    expect(response.statusCode).toBe(201)
  })

  it('acepta una dependencia sin vínculos como respaldo', async () => {
    const response = await post(
      context.cookies.admin,
      ticketBody(refs.dependencyId, refs.locationId),
    )
    expect(response.statusCode).toBe(201)
  })
})
