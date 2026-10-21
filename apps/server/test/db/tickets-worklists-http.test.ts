import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

type PageBody = {
  items: Array<{ id: string }>
  total: number
  page: number
  pageSize: number
}

let context: TicketHttpContext

async function get(path: string, cookie?: string) {
  return context.app.inject({
    method: 'GET',
    url: path,
    headers: authHeaders(cookie),
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('my work', () => {
  it('returns only the active assignments of the technician', async () => {
    const response = await get('/api/tickets/mine', context.cookies.technician)
    expect(response.statusCode).toBe(200)
    const body = response.json() as PageBody
    expect(body.items.map((item) => item.id)).toEqual([context.ids.ticketA1])
  })

  it('returns an empty page for actors without a technician profile', async () => {
    for (const cookie of [context.cookies.admin, context.cookies.requester]) {
      const response = await get('/api/tickets/mine', cookie)
      expect(response.statusCode).toBe(200)
      expect((response.json() as PageBody).total).toBe(0)
    }
  })

  it('rejects actors without ticket.view', async () => {
    const response = await get('/api/tickets/mine', context.cookies.noAccess)
    expect(response.statusCode).toBe(403)
  })

  it('excludes final tickets', async () => {
    await context.db.execute(sql`
      update public.tickets set status = 'closed'
      where id = ${context.ids.ticketA1}
    `)
    try {
      const response = await get(
        '/api/tickets/mine',
        context.cookies.technician,
      )
      expect((response.json() as PageBody).total).toBe(0)
    } finally {
      await context.db.execute(sql`
        update public.tickets set status = 'registered'
        where id = ${context.ids.ticketA1}
      `)
    }
  })

  it('rejects invalid pagination', async () => {
    const response = await get(
      '/api/tickets/mine?pageSize=101',
      context.cookies.technician,
    )
    expect(response.statusCode).toBe(400)
  })
})

describe('offers', () => {
  it('returns offers for the supervisor and administrator', async () => {
    const supervisor = await get(
      '/api/tickets/offers',
      context.cookies.supervisor,
    )
    expect(supervisor.statusCode).toBe(200)
    expect(
      (supervisor.json() as PageBody).items.map((item) => item.id),
    ).toEqual([context.ids.ticketAux])

    const admin = await get('/api/tickets/offers', context.cookies.admin)
    expect((admin.json() as PageBody).total).toBe(0)
  })

  it('rejects actors without take_offer', async () => {
    for (const cookie of [
      context.cookies.requester,
      context.cookies.technician,
    ]) {
      const response = await get('/api/tickets/offers', cookie)
      expect(response.statusCode).toBe(403)
    }
  })
})

describe('supervisors', () => {
  it('filters supervisors by the actor scope', async () => {
    const supervisor = await get('/api/supervisors', context.cookies.supervisor)
    expect(supervisor.statusCode).toBe(200)
    const body = supervisor.json() as {
      items: Array<{ fullName: string; teamIds: string[] }>
    }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.fullName).toBe('supervisor-access')
    expect(body.items[0]?.teamIds).toHaveLength(1)
  })

  it('returns every active supervisor to an administrator', async () => {
    const admin = await get('/api/supervisors', context.cookies.admin)
    expect(admin.statusCode).toBe(200)
    expect(
      (admin.json() as { items: Array<{ fullName: string }> }).items.map(
        (item) => item.fullName,
      ),
    ).toEqual(expect.arrayContaining(['supervisor-access', 'Otro supervisor']))
  })

  it('rejects actors without assign_supervisor', async () => {
    for (const cookie of [
      context.cookies.requester,
      context.cookies.technician,
    ]) {
      const response = await get('/api/supervisors', cookie)
      expect(response.statusCode).toBe(403)
    }
  })
})
