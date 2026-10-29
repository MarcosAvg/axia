import type { InjectOptions } from 'fastify'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

function call(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  cookie: string,
  payload?: Record<string, unknown>,
) {
  const options: InjectOptions = {
    method,
    url,
    headers: authHeaders(cookie),
    ...(payload === undefined ? {} : { payload }),
  }
  return context.app.inject(options)
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

async function createTicketAt(occurredAt: string): Promise<string> {
  const source = await context.db.execute(sql`
    select requester_id, building_id, location_id, dependency_id, category_id
    from public.tickets where id = ${context.ids.ticketA1}
  `)
  const ticket = source.rows[0] as Record<string, string>
  const response = await call('POST', '/api/tickets', context.cookies.admin, {
    buildingId: ticket.building_id,
    locationId: ticket.location_id,
    dependencyId: ticket.dependency_id,
    categoryId: ticket.category_id,
    description: `Alta proxy ${crypto.randomUUID()}`,
    requesterId: ticket.requester_id,
    occurredAt,
    clientRequestId: crypto.randomUUID(),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

type TimelineItem = { id: number; type: string; occurredAt: string }

async function timeline(ticketId: string): Promise<TimelineItem[]> {
  const response = await call(
    'GET',
    `/api/tickets/${ticketId}/timeline`,
    context.cookies.admin,
  )
  return (response.json() as { items: TimelineItem[] }).items
}

async function technicianByName(fullName: string): Promise<string> {
  const technician = await context.db.execute(sql`
    select id from public.technicians
    where full_name = ${fullName} and active
    limit 1
  `)
  return (technician.rows[0] as { id: string }).id
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('rejects a creation time when the ticket is registered for oneself', async () => {
  const ownRequester = await context.db.execute(sql`
    insert into public.requesters (full_name, user_id)
    values (
      'Administrador solicitante',
      (select id from public.users where username = 'admin-access')
    )
    returning id
  `)
  const requesterId = (ownRequester.rows[0] as { id: string }).id
  const source = await context.db.execute(sql`
    select building_id, location_id, dependency_id, category_id
    from public.tickets where id = ${context.ids.ticketA1}
  `)
  const ticket = source.rows[0] as Record<string, string>
  const response = await call('POST', '/api/tickets', context.cookies.admin, {
    buildingId: ticket.building_id,
    locationId: ticket.location_id,
    dependencyId: ticket.dependency_id,
    categoryId: ticket.category_id,
    description: `Alta propia con hora ${crypto.randomUUID()}`,
    requesterId,
    occurredAt: minutesAgo(30),
    clientRequestId: crypto.randomUUID(),
  })
  expect(response.statusCode).toBe(400)
})

it('rejects a manual action time without a proxy subject', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const action = await call(
    'POST',
    `/api/tickets/${ticketId}/actions`,
    context.cookies.admin,
    {
      action: 'comment',
      text: 'Comentario con hora real',
      occurredAt: minutesAgo(30),
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(action.statusCode).toBe(400)
})

it('rejects a proxy subject outside the actor team', async () => {
  const subjectTechnicianId = await technicianByName('Técnico B')
  const action = await call(
    'POST',
    `/api/tickets/${context.ids.ticketAux}/actions`,
    context.cookies.supervisor,
    {
      action: 'recapture',
      changes: { description: 'Recaptura fuera de equipo' },
      subjectTechnicianId,
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(action.statusCode).toBe(403)
})

it('rejects a proxy subject that does not participate in the ticket', async () => {
  const subjectTechnicianId = await technicianByName('Técnico B')
  const action = await call(
    'POST',
    `/api/tickets/${context.ids.ticketA1}/actions`,
    context.cookies.admin,
    {
      action: 'start',
      subjectTechnicianId,
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(action.statusCode).toBe(400)
})

it('allows a supervisor to act for a technician of their team', async () => {
  const subjectTechnicianId = await technicianByName('Técnico A')
  const action = await call(
    'POST',
    `/api/tickets/${context.ids.ticketAux}/actions`,
    context.cookies.supervisor,
    {
      action: 'recapture',
      changes: { description: 'Recaptura del equipo' },
      subjectTechnicianId,
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(action.statusCode).toBe(200)

  const timeline = await call(
    'GET',
    `/api/tickets/${context.ids.ticketAux}/timeline`,
    context.cookies.supervisor,
  )
  const event = (
    timeline.json() as {
      items: Array<{ type: string; subjectTechnicianName: string | null }>
    }
  ).items.findLast((item) => item.type === 'capture_recaptured')
  expect(event?.subjectTechnicianName).toBe('Técnico A')
})

it('keeps a correction between its neighbours and lets the creation move earlier', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const subjectTechnicianId = await technicianByName('Técnico A')
  for (const [description, occurredAt] of [
    ['Primera recaptura', minutesAgo(40)],
    ['Segunda recaptura', minutesAgo(20)],
  ] as const) {
    const response = await call(
      'POST',
      `/api/tickets/${ticketId}/actions`,
      context.cookies.admin,
      {
        action: 'recapture',
        changes: { description },
        subjectTechnicianId,
        occurredAt,
        clientRequestId: crypto.randomUUID(),
      },
    )
    expect(response.statusCode).toBe(200)
  }

  const history = await timeline(ticketId)
  const created = history[0]
  const firstRecapture = history.find(
    (item) => item.type === 'capture_recaptured',
  )

  const crossed = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${firstRecapture?.id}/time`,
    context.cookies.admin,
    { occurredAt: minutesAgo(10) },
  )
  expect(crossed.statusCode).toBe(409)

  const afterNext = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${created?.id}/time`,
    context.cookies.admin,
    { occurredAt: minutesAgo(30) },
  )
  expect(afterNext.statusCode).toBe(409)

  const earlier = minutesAgo(90)
  const moved = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${created?.id}/time`,
    context.cookies.admin,
    { occurredAt: earlier },
  )
  expect(moved.statusCode).toBe(204)
  const detail = await call(
    'GET',
    `/api/tickets/${ticketId}`,
    context.cookies.admin,
  )
  expect(
    (detail.json() as { ticket: { reportedAt: string } }).ticket.reportedAt,
  ).toBe(earlier)
  expect((await timeline(ticketId))[0]?.occurredAt).toBe(earlier)
})

it('rejects a sync manual time without a proxy subject', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const response = await call(
    'POST',
    '/api/sync/actions',
    context.cookies.admin,
    {
      items: [
        {
          clientRequestId: crypto.randomUUID(),
          ticketId,
          type: 'comment',
          args: { text: 'Acción sin sujeto' },
          occurredAt: minutesAgo(20),
          manualTime: true,
        },
      ],
    },
  )
  expect(response.statusCode).toBe(200)
  expect(
    (response.json() as { results: Array<{ status: string }> }).results[0]
      ?.status,
  ).toBe('rejected')
})
