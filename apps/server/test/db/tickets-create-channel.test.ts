import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  if (context) await closeTicketHttpApp(context)
})

function register(cookie: string) {
  const clientRequestId = randomUUID()
  return context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload: {
      buildingId: refs.buildingId,
      locationId: refs.locationId,
      dependencyId: refs.dependencyId,
      categoryId: refs.categoryId,
      subcategoryId: refs.subcategoryId,
      problemId: refs.problemId,
      requesterId: refs.requesterId,
      channelId: refs.channelId,
      description: `Registro con canal de prueba ${clientRequestId}`,
      clientRequestId,
    },
  })
}

async function savedChannel(response: Awaited<ReturnType<typeof register>>) {
  expect(response.statusCode).toBe(201)
  const { ticket } = response.json<{ ticket: { id: string } }>()
  const result = await context.db.execute(sql`
    select ch.name from public.channels ch
    join public.tickets t on t.channel_id = ch.id where t.id = ${ticket.id}
  `)
  return result.rows[0]?.name
}

it('usa el canal marcado aunque cambie de nombre y respeta la selección de un registro a nombre de otra persona', async () => {
  await context.db.execute(
    sql`update public.channels set name = 'Portal de mantenimiento' where is_platform`,
  )
  const catalog = await context.app.inject({
    method: 'GET',
    url: '/api/catalogs/channels',
    headers: authHeaders(context.cookies.requester),
  })
  expect(catalog.statusCode).toBe(200)
  expect(catalog.json()).toMatchObject({
    items: expect.arrayContaining([
      expect.objectContaining({
        name: 'Portal de mantenimiento',
        isPlatform: true,
      }),
      expect.objectContaining({ name: 'Teléfono', isPlatform: false }),
    ]),
  })
  expect(await savedChannel(await register(context.cookies.requester))).toBe(
    'Portal de mantenimiento',
  )
  expect(await savedChannel(await register(context.cookies.admin))).toBe(
    'Teléfono',
  )
})

async function expectInvalidConfiguration() {
  const response = await register(context.cookies.requester)
  expect(response.statusCode).toBe(400)
  expect(response.json()).toMatchObject({
    error: { code: 'platform_channel_configuration' },
  })
}

it('rechaza el registro propio sin una única vía activa marcada', async () => {
  await context.db.execute(
    sql`update public.channels set active = false where is_platform`,
  )
  await expectInvalidConfiguration()

  await context.db.execute(sql`
    update public.channels set is_platform = true, active = true
    where name in ('Teléfono', 'Importación')
  `)
  await expectInvalidConfiguration()
  expect(await savedChannel(await register(context.cookies.admin))).toBe(
    'Teléfono',
  )
})
