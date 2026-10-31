import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
const endpoint = '/api/admin/catalogs/reasons'
const payload = (name: string) => ({
  use: 'pause',
  name,
  clock_class: 'counted',
  active: true,
})
async function create(name: string, extra = {}) {
  const response = await context.app.inject({
    method: 'POST',
    url: endpoint,
    headers: authHeaders(context.cookies.admin),
    payload: { ...payload(name), ...extra },
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { id: string }).id
}
async function update(id: string, values: Record<string, unknown>) {
  return context.app.inject({
    method: 'PATCH',
    url: `${endpoint}/${id}`,
    headers: authHeaders(context.cookies.admin),
    payload: values,
  })
}
beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)
afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('administración de motivos', () => {
  it('permite configurar una raíz y sus descendientes progresivamente', async () => {
    const root = await create('Raíz administrativa')
    const child = await create('Subestado administrativo', { parent_id: root })
    expect(
      (await update(child, { name: 'Subestado editado' })).statusCode,
    ).toBe(204)
    const read = await context.app.inject({
      method: 'GET',
      url: '/api/catalogs/reasons?use=pause',
      headers: authHeaders(context.cookies.admin),
    })
    expect(read.json()).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ id: root }),
        expect.objectContaining({ id: child }),
      ]),
    })
  })
  it('rechaza creación y edición sin permiso de administrar catálogos', async () => {
    const id = await create('Protección de permisos')
    for (const method of ['POST', 'PATCH'] as const) {
      const response = await context.app.inject({
        method,
        url: method === 'POST' ? endpoint : `${endpoint}/${id}`,
        headers: authHeaders(context.cookies.requester),
        payload: payload('Sin permiso'),
      })
      expect(response.statusCode).toBe(403)
    }
  })
  it('valida enums, tipos, nombres vacíos y orden antes de SQL', async () => {
    for (const extra of [
      { use: 'unknown' },
      { clock_class: 'unknown' },
      { active: 'true' },
      { position: 1.5 },
      { position: 40000 },
      { name: '  ' },
      { parent_id: 'invalid' },
    ]) {
      const response = await context.app.inject({
        method: 'POST',
        url: endpoint,
        headers: authHeaders(context.cookies.admin),
        payload: { ...payload('Validación'), ...extra },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({
        error: { code: 'validation_error' },
      })
    }
  })
})

describe('integridad del árbol de motivos', () => {
  it('rechaza padre inexistente, padre de otro uso y ciclos', async () => {
    const root = await create('Raíz para ciclos')
    const child = await create('Hijo para ciclos', { parent_id: root })
    expect(
      (await update(child, { parent_id: crypto.randomUUID() })).statusCode,
    ).toBe(400)
    const rejection = await create('Rechazo padre', { use: 'rejection' })
    expect((await update(child, { parent_id: rejection })).statusCode).toBe(400)
    expect((await update(root, { parent_id: child })).statusCode).toBe(400)
    expect((await update(root, { parent_id: root })).statusCode).toBe(400)
    expect((await update(root, { use: 'rejection' })).statusCode).toBe(400)
  })
  it('responde conflicto interpretable al duplicar nombre dentro del mismo padre y uso', async () => {
    await create('Duplicado administrativo')
    const response = await context.app.inject({
      method: 'POST',
      url: endpoint,
      headers: authHeaders(context.cookies.admin),
      payload: payload('Duplicado administrativo'),
    })
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: { code: 'conflict' } })
    expect(response.body).not.toContain('insert into')
  })
  it('preserva el árbol de una pausa abierta y permite nombrarlo y añadir salidas', async () => {
    const root = await create('Raíz con pausa abierta')
    const child = await create('Salida con pausa abierta', { parent_id: root })
    await context.db.execute(
      sql`insert into public.ticket_pauses (ticket_id, cycle, reason_id, root_reason_id) select id, cycle, ${root}, ${root} from public.tickets limit 1`,
    )
    expect((await update(child, { active: false })).statusCode).toBe(409)
    expect((await update(child, { parent_id: null })).statusCode).toBe(409)
    expect(
      (await update(root, { clock_class: 'not_counted' })).statusCode,
    ).toBe(409)
    expect(
      (await update(child, { name: 'Salida renombrada', position: 2 }))
        .statusCode,
    ).toBe(204)
    await create('Otra salida de pausa abierta', { parent_id: root })
  })
})
