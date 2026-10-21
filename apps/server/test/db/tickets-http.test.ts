import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

type PageBody = {
  items: Array<{ id: string; closedAt: string | null }>
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

function pageBody(path: string, cookie: string): Promise<PageBody> {
  return get(path, cookie).then((response) => {
    expect(response.statusCode).toBe(200)
    return response.json() as PageBody
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('ticket routes authentication', () => {
  it('returns 401 without a session', async () => {
    const urls = [
      '/api/tickets',
      `/api/tickets/${context.ids.ticketA1}`,
      `/api/tickets/${context.ids.ticketA1}/timeline`,
      `/api/tickets/${context.ids.ticketA1}/participants`,
    ]
    for (const url of urls) {
      const response = await get(url)
      expect(response.statusCode).toBe(401)
    }
  })

  it('returns 403 when the actor lacks ticket.view', async () => {
    const urls = [
      '/api/tickets',
      `/api/tickets/${context.ids.ticketA1}`,
      `/api/tickets/${context.ids.ticketA1}/timeline`,
      `/api/tickets/${context.ids.ticketA1}/participants`,
    ]
    for (const url of urls) {
      const response = await get(url, context.cookies.noAccess)
      expect(response.statusCode).toBe(403)
      expect(response.json()).toMatchObject({
        error: { code: 'forbidden' },
      })
    }
  })
})

describe('ticket list scope', () => {
  it('limits every role to its scope', async () => {
    const { ids, cookies } = context
    expect((await pageBody('/api/tickets', cookies.admin)).total).toBe(4)

    const requester = await pageBody('/api/tickets', cookies.requester)
    expect(requester.items.map((item) => item.id).sort()).toEqual(
      [ids.ticketA1, ids.ticketA2].sort(),
    )

    const technician = await pageBody('/api/tickets', cookies.technician)
    expect(technician.items.map((item) => item.id).sort()).toEqual(
      [ids.ticketA1, ids.ticketAux].sort(),
    )

    const supervisor = await pageBody('/api/tickets', cookies.supervisor)
    expect(supervisor.items.map((item) => item.id).sort()).toEqual(
      [ids.ticketA1, ids.ticketAux].sort(),
    )

    const outsider = await pageBody('/api/tickets', cookies.outsider)
    expect(outsider.items).toEqual([])
    expect(outsider.total).toBe(0)
  })

  it('applies filters and pagination inside the scope', async () => {
    const { cookies } = context
    const search = await pageBody(
      '/api/tickets?search=Fuga',
      cookies.supervisor,
    )
    expect(search.items).toHaveLength(1)

    const closed = await pageBody('/api/tickets?status=closed', cookies.admin)
    expect(closed.items).toEqual([])

    const statuses = await pageBody(
      '/api/tickets?statuses=registered,closed',
      cookies.admin,
    )
    expect(statuses.total).toBe(4)

    const page = await pageBody('/api/tickets?page=2&pageSize=1', cookies.admin)
    expect(page).toMatchObject({ total: 4, page: 2, pageSize: 1 })
    expect(page.items).toHaveLength(1)
  })

  it('rejects invalid filters', async () => {
    const { cookies } = context
    for (const path of [
      '/api/tickets?pageSize=101',
      '/api/tickets?status=invalid',
      '/api/tickets?buildingId=not-a-uuid',
      '/api/tickets?statuses=',
    ]) {
      const response = await get(path, cookies.admin)
      expect(response.statusCode).toBe(400)
    }
  })
})

describe('ticket detail', () => {
  it('returns the detail to an actor with access', async () => {
    const response = await get(
      `/api/tickets/${context.ids.ticketA1}`,
      context.cookies.requester,
    )
    expect(response.statusCode).toBe(200)
    expect((response.json() as { ticket: unknown }).ticket).toMatchObject({
      id: context.ids.ticketA1,
      status: 'registered',
      cycle: 1,
      closedAt: null,
      description: 'Fuga en el baño',
      locationName: 'Sala A1',
      dependencyName: 'Dependencia',
      categoryName: 'Categoría A',
      priorityName: 'Media',
      priorityPosition: 3,
      teamName: 'Equipo A',
    })
  })

  it('returns 404 for a ticket outside the scope', async () => {
    const { ids, cookies } = context
    const cases = [
      [cookies.requester, ids.ticketB1],
      [cookies.technician, ids.ticketB1],
      [cookies.supervisor, ids.ticketA2],
      [cookies.outsider, ids.ticketA1],
    ] as const
    for (const [cookie, id] of cases) {
      const response = await get(`/api/tickets/${id}`, cookie)
      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ error: { code: 'not_found' } })
    }
  })

  it('rejects an invalid ticket id', async () => {
    const response = await get('/api/tickets/not-a-uuid', context.cookies.admin)
    expect(response.statusCode).toBe(400)
  })
})

describe('ticket timeline', () => {
  it('hides internal events from the requester', async () => {
    const requester = await get(
      `/api/tickets/${context.ids.ticketA1}/timeline`,
      context.cookies.requester,
    )
    expect(requester.statusCode).toBe(200)
    expect(
      (requester.json() as { items: Array<{ type: string }> }).items.map(
        (item) => item.type,
      ),
    ).toEqual(['created'])

    const admin = await get(
      `/api/tickets/${context.ids.ticketA1}/timeline`,
      context.cookies.admin,
    )
    expect(
      (admin.json() as { items: Array<{ type: string }> }).items.map(
        (item) => item.type,
      ),
    ).toEqual(['created', 'comment'])
  })

  it('returns 404 outside the scope and 400 for an invalid id', async () => {
    const outside = await get(
      `/api/tickets/${context.ids.ticketA2}/timeline`,
      context.cookies.supervisor,
    )
    expect(outside.statusCode).toBe(404)

    const invalid = await get(
      '/api/tickets/not-a-uuid/timeline',
      context.cookies.admin,
    )
    expect(invalid.statusCode).toBe(400)
  })
})

describe('ticket participants', () => {
  it('lists participants for a visible ticket', async () => {
    const response = await get(
      `/api/tickets/${context.ids.ticketAux}/participants`,
      context.cookies.technician,
    )
    expect(response.statusCode).toBe(200)
    const body = response.json() as {
      items: Array<{
        technicianName: string
        participationType: string
        endedAt: string | null
      }>
    }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      technicianName: 'Técnico A',
      participationType: 'leader',
      endedAt: null,
    })
  })

  it('returns 404 outside the scope', async () => {
    const { ids, cookies } = context
    for (const cookie of [cookies.requester, cookies.outsider]) {
      const response = await get(
        `/api/tickets/${ids.ticketAux}/participants`,
        cookie,
      )
      expect(response.statusCode).toBe(404)
    }
  })
})
