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

async function remove(
  table: string,
  id: string,
  cookie = context.cookies.admin,
) {
  return context.app.inject({
    method: 'DELETE',
    url: `/api/admin/catalogs/${table}/${id}`,
    headers: authHeaders(cookie),
  })
}

async function insertBuilding(name: string): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.buildings (name) values (${name}) returning id
  `)
  return (result.rows[0] as { id: string }).id
}

async function countRows(table: string, column: string, id: string) {
  const result = await context.db.execute(sql`
    select count(*)::int as total
    from ${sql.identifier(table)}
    where ${sql.identifier(column)} = ${id}
  `)
  return (result.rows[0] as { total: number }).total
}

async function createReason(name: string, parentId?: string) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/admin/catalogs/reasons',
    headers: authHeaders(context.cookies.admin),
    payload: {
      use: 'pause',
      name,
      clock_class: 'counted',
      active: true,
      ...(parentId ? { parent_id: parentId } : {}),
    },
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { id: string }).id
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('eliminar registros de catálogo sin uso', () => {
  it('borra el registro que no tiene uso', async () => {
    const id = await insertBuilding('Edificio desechable')
    const response = await remove('buildings', id)
    expect(response.statusCode).toBe(204)
    expect(await countRows('buildings', 'id', id)).toBe(0)
  })

  it('elimina una dependencia con sus vínculos de ubicación', async () => {
    const created = await context.app.inject({
      method: 'POST',
      url: '/api/admin/catalogs/dependencies',
      headers: authHeaders(context.cookies.admin),
      payload: {
        name: 'Dependencia desechable',
        active: true,
        locationIds: [refs.locationId],
      },
    })
    expect(created.statusCode).toBe(201)
    const id = (created.json() as { id: string }).id
    expect((await remove('dependencies', id)).statusCode).toBe(204)
    expect(await countRows('dependency_locations', 'dependency_id', id)).toBe(0)
  })

  it('responde 404 al repetir el borrado', async () => {
    const id = await insertBuilding('Edificio de un solo borrado')
    expect((await remove('buildings', id)).statusCode).toBe(204)
    expect((await remove('buildings', id)).statusCode).toBe(404)
  })
})

describe('proteger lo que ya está en uso', () => {
  it('conserva un edificio usado y sugiere desactivarlo', async () => {
    const response = await remove('buildings', refs.buildingId)
    expect(response.statusCode).toBe(409)
    expect(
      (response.json() as { error: { message: string } }).error.message,
    ).toContain('desactívalo')
    expect(await countRows('buildings', 'id', refs.buildingId)).toBe(1)
  })

  it('conserva un motivo con subestados', async () => {
    const root = await createReason('Raíz protegida')
    await createReason('Hija protegida', root)
    const response = await remove('reasons', root)
    expect(response.statusCode).toBe(409)
    expect(
      (response.json() as { error: { message: string } }).error.message,
    ).toContain('subestados')
    expect(await countRows('reasons', 'id', root)).toBe(1)
  })

  it('conserva una categoría con designaciones de técnicos', async () => {
    const created = await context.db.execute(sql`
      insert into public.categories (name) values ('Categoría designada')
      returning id
    `)
    const categoryId = (created.rows[0] as { id: string }).id
    await context.db.execute(sql`
      insert into public.technician_categories (technician_id, category_id)
      values (${refs.technicianId}, ${categoryId})
    `)
    const response = await remove('categories', categoryId)
    expect(response.statusCode).toBe(409)
    expect(
      (response.json() as { error: { message: string } }).error.message,
    ).toContain('designaciones')
    expect(await countRows('categories', 'id', categoryId)).toBe(1)
  })

  it('exige catalog.manage para eliminar', async () => {
    const id = await insertBuilding('Edificio protegido por permisos')
    const response = await remove('buildings', id, context.cookies.requester)
    expect(response.statusCode).toBe(403)
    expect(await countRows('buildings', 'id', id)).toBe(1)
  })

  it('responde 404 con un identificador desconocido', async () => {
    expect((await remove('buildings', randomUUID())).statusCode).toBe(404)
  })
})
