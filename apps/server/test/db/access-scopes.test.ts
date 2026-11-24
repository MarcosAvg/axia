import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, expect, it } from 'vitest'

import {
  buildAuthTestApp,
  closeAuthTestApp,
  headers,
  setupOps,
  type AuthTestContext,
} from './auth-helpers.js'

let context: AuthTestContext

beforeEach(async () => {
  context = await buildAuthTestApp()
}, 60_000)

afterEach(async () => {
  await closeAuthTestApp(context)
})

it('crea y edita edificios del ámbito en una sola operación con permiso de designaciones', async () => {
  const { adminCookie, opsCookie, opsId } = await setupOps(context)
  const teamId = randomUUID()
  const buildings = [randomUUID(), randomUUID()]
  await context.db.execute(
    sql`insert into public.teams (id, name) values (${teamId}, 'Equipo de prueba')`,
  )
  await context.db.execute(sql`
    insert into public.buildings (id, name)
    values (${buildings[0]}, 'Edificio de prueba A'), (${buildings[1]}, 'Edificio de prueba B')
  `)
  const url = '/api/admin/access/scopes'
  const payload = { userId: opsId, teamId, buildingIds: buildings }
  const create = (cookie: string) =>
    context.app.inject({
      method: 'POST',
      url,
      headers: headers(cookie),
      payload,
    })
  expect((await create(opsCookie)).statusCode).toBe(403)
  expect((await create(adminCookie)).statusCode).toBe(204)

  const result = await context.db.execute(sql`
    select s.id, array_agg(b.building_id order by b.building_id) as buildings
    from public.supervisor_scopes s
    join public.supervisor_scope_buildings b on b.scope_id = s.id
    where s.user_id = ${opsId}
    group by s.id
  `)
  expect(result.rows[0]?.buildings).toEqual([...buildings].sort())
  const edit = (cookie: string, buildingIds: string[]) =>
    context.app.inject({
      method: 'PATCH',
      url: `${url}/${String(result.rows[0]?.id)}`,
      headers: headers(cookie),
      payload: { buildingIds },
    })
  expect((await edit(opsCookie, buildings)).statusCode).toBe(403)
  expect((await edit(adminCookie, buildings.slice(1))).statusCode).toBe(204)
  const saved = await context.db.execute(sql`
    select building_id from public.supervisor_scope_buildings
    where scope_id = ${result.rows[0]?.id}
  `)
  expect(saved.rows).toEqual([{ building_id: buildings[1] }])
})

it('reemplaza las categorías en conjunto y conserva las anteriores ante un error', async () => {
  const { adminCookie, opsCookie } = await setupOps(context)
  const technicianId = randomUUID()
  const categories = [randomUUID(), randomUUID()]
  const teamId = randomUUID()
  await context.db.execute(
    sql`insert into public.teams (id, name) values (${teamId}, 'Equipo de prueba')`,
  )
  await context.db.execute(sql`
    insert into public.technicians (id, full_name, team_id)
    values (${technicianId}, 'Técnico de prueba', ${teamId})
  `)
  await context.db.execute(sql`
    insert into public.categories (id, name)
    values (${categories[0]}, 'Categoría de prueba A'), (${categories[1]}, 'Categoría de prueba B')
  `)
  const save = (cookie: string, categoryIds: string[]) =>
    context.app.inject({
      method: 'PATCH',
      url: `/api/admin/access/technician-categories/${technicianId}`,
      headers: headers(cookie),
      payload: { categoryIds },
    })
  expect((await save(opsCookie, categories)).statusCode).toBe(403)
  expect((await save(adminCookie, categories)).statusCode).toBe(204)
  expect((await save(adminCookie, categories.slice(1))).statusCode).toBe(204)
  expect(
    (await save(adminCookie, [randomUUID()])).statusCode,
  ).toBeGreaterThanOrEqual(400)
  const saved = await context.db.execute(sql`
    select category_id from public.technician_categories where technician_id = ${technicianId}
  `)
  expect(saved.rows).toEqual([{ category_id: categories[1] }])
  expect((await save(adminCookie, [])).statusCode).toBe(204)
  const cleared = await context.db.execute(sql`
    select category_id from public.technician_categories where technician_id = ${technicianId}
  `)
  expect(cleared.rows).toEqual([])
})
