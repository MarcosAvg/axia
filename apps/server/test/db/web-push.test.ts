import { generateKeyPairSync } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import { testConfig } from '../http/helpers.js'
import { appConnectionString } from './helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
const endpoint = 'https://fcm.googleapis.com/fcm/send/axia-test'
const subscription = {
  endpoint,
  keys: { p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) },
}
const origin = 'http://localhost'

function register(cookie?: string, payload = subscription) {
  return context.app.inject({
    method: 'PUT',
    url: '/api/notifications/push',
    headers: { origin, ...(cookie ? { cookie } : {}) },
    payload,
  })
}

async function addNotice(username: string) {
  await context.db.execute(sql`
    insert into public.notifications (recipient_user_id, ticket_id, type)
    select id, ${context.ids.ticketA1}, 'assigned_technician'
    from public.users where username = ${username}
  `)
}

beforeAll(async () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  context = await buildTicketHttpApp({
    runtimeConnectionString: appConnectionString(),
    config: {
      ...testConfig,
      WEB_PUSH_PRIVATE_KEY: privateKey
        .export({ format: 'der', type: 'pkcs8' })
        .toString('base64'),
      WEB_PUSH_CONTACT: 'mailto:axia@example.com',
    },
  })
}, 60_000)

afterAll(async () => {
  if (context) await closeTicketHttpApp(context)
  vi.unstubAllGlobals()
})

it('requires an authorized account and a supported push provider', async () => {
  expect((await register()).statusCode).toBe(401)
  expect((await register(context.cookies.noAccess)).statusCode).toBe(403)
  const invalid = { ...subscription, endpoint: 'https://127.0.0.1/push' }
  expect((await register(context.cookies.technician, invalid)).statusCode).toBe(
    400,
  )
})

it('queues notices per device and drops deliveries outside the recipient scope', async () => {
  const send = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 201 }),
  )
  vi.stubGlobal('fetch', send)

  expect((await register(context.cookies.technician)).statusCode).toBe(204)
  expect((await register(context.cookies.technician)).statusCode).toBe(204)
  const second = `${endpoint}-second`
  const outsider = `${endpoint}-outsider`
  expect(
    (
      await register(context.cookies.technician, {
        ...subscription,
        endpoint: second,
      })
    ).statusCode,
  ).toBe(204)
  expect(
    (
      await register(context.cookies.outsider, {
        ...subscription,
        endpoint: outsider,
      })
    ).statusCode,
  ).toBe(204)
  await addNotice('technician-access')
  await addNotice('outsider-access')

  await vi.waitFor(
    async () => {
      const result = await context.db.execute<{
        endpoint: string
        status: string
      }>(sql`
      select p.endpoint, d.status
      from public.notification_deliveries d
      join public.push_subscriptions p on p.id = d.push_subscription_id
      order by p.endpoint
    `)
      expect(result.rows).toEqual([
        { endpoint, status: 'sent' },
        { endpoint: outsider, status: 'abandoned' },
        { endpoint: second, status: 'sent' },
      ])
    },
    { timeout: 7000 },
  )
  expect(send).toHaveBeenCalledTimes(2)
  expect(send.mock.calls).toContainEqual([
    new URL(endpoint),
    expect.objectContaining({
      method: 'POST',
      redirect: 'error',
    }),
  ])
})

it('does not enqueue notices for a session that expired through inactivity', async () => {
  const idleEndpoint = `${endpoint}-idle`
  expect(
    (
      await register(context.cookies.requester, {
        ...subscription,
        endpoint: idleEndpoint,
      })
    ).statusCode,
  ).toBe(204)
  await context.db.execute(sql`
    update public.sessions
    set idle_expires_at = now() - interval '1 second'
    where id = (select session_id from public.push_subscriptions where endpoint = ${idleEndpoint})
  `)
  await context.db.execute(sql`
    insert into public.notifications (recipient_user_id, ticket_id, type)
    select user_id, ${context.ids.ticketA1}, 'attended'
    from public.push_subscriptions where endpoint = ${idleEndpoint}
  `)
  const result = await context.db.execute(sql`
    select d.id from public.notification_deliveries d
    join public.push_subscriptions p on p.id = d.push_subscription_id
    where p.endpoint = ${idleEndpoint}
  `)
  expect(result.rows).toEqual([])
})
