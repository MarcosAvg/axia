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

type TimelineItem = {
  id: number
  type: string
  occurredAt: string
  subjectTechnicianName: string | null
  payload: Record<string, unknown>
}

function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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
    description: `Alta con hora ${crypto.randomUUID()}`,
    requesterId: ticket.requester_id,
    occurredAt,
    clientRequestId: crypto.randomUUID(),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function timeline(ticketId: string): Promise<TimelineItem[]> {
  const response = await call(
    'GET',
    `/api/tickets/${ticketId}/timeline`,
    context.cookies.admin,
  )
  return (response.json() as { items: TimelineItem[] }).items
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('records a ticket creation time and keeps the event aligned', async () => {
  const occurredAt = minutesAgo(60)
  const ticketId = await createTicketAt(occurredAt)
  const detail = await call(
    'GET',
    `/api/tickets/${ticketId}`,
    context.cookies.admin,
  )
  expect(
    (detail.json() as { ticket: { reportedAt: string } }).ticket.reportedAt,
  ).toBe(occurredAt)
  expect((await timeline(ticketId))[0]?.occurredAt).toBe(occurredAt)
})

async function technicianId(): Promise<string> {
  const technician = await context.db.execute(sql`
    select id from public.technicians
    where full_name = 'Técnico A' and active
    limit 1
  `)
  return (technician.rows[0] as { id: string }).id
}

it('records a proxy action time, corrects it and audits the change', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const occurredAt = minutesAgo(30)
  const subjectTechnicianId = await technicianId()
  const action = await call(
    'POST',
    `/api/tickets/${ticketId}/actions`,
    context.cookies.admin,
    {
      action: 'recapture',
      changes: { description: 'Recaptura con hora real' },
      subjectTechnicianId,
      occurredAt,
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(action.statusCode).toBe(200)

  const recapture = (await timeline(ticketId)).findLast(
    (item) => item.type === 'capture_recaptured',
  )
  expect(recapture?.occurredAt).toBe(occurredAt)
  expect(recapture?.subjectTechnicianName).toBe('Técnico A')

  const correctedAt = minutesAgo(20)
  const corrected = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${recapture?.id}/time`,
    context.cookies.admin,
    { occurredAt: correctedAt },
  )
  expect(corrected.statusCode).toBe(204)

  const history = await timeline(ticketId)
  expect(history.find((item) => item.id === recapture?.id)?.occurredAt).toBe(
    correctedAt,
  )
  const audit = history.find((item) => item.type === 'event_time_corrected')
  expect(audit?.payload).toMatchObject({
    eventId: String(recapture?.id),
    previousOccurredAt: occurredAt,
    occurredAt: correctedAt,
  })
})

it('rebuilds the derived spans after correcting an assignment time', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const technician = await context.db.execute(sql`
    select id from public.technicians where active order by full_name limit 1
  `)
  const technicianId = (technician.rows[0] as { id: string }).id
  const assigned = await call(
    'POST',
    `/api/tickets/${ticketId}/actions`,
    context.cookies.admin,
    {
      action: 'assign_technician',
      technicianId,
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(assigned.statusCode).toBe(200)
  const assignedEvent = (await timeline(ticketId)).findLast(
    (item) => item.type === 'assigned_technician',
  )
  const correctedAt = minutesAgo(40)
  const corrected = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${assignedEvent?.id}/time`,
    context.cookies.admin,
    { occurredAt: correctedAt },
  )
  expect(corrected.statusCode).toBe(204)

  const spans = await context.db.execute(sql`
    select ended_at from public.time_spans
    where ticket_id = ${ticketId} and kind = 'technician_assignment'
    order by ended_at desc limit 1
  `)
  const endedAt = (spans.rows[0] as { ended_at: Date | string }).ended_at
  expect(new Date(endedAt).toISOString()).toBe(correctedAt)
})

it('records the real time on evidence for a progress update', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const occurredAt = minutesAgo(20)
  const created = await call(
    'POST',
    `/api/tickets/${ticketId}/evidence`,
    context.cookies.admin,
    {
      type: 'during',
      clientRequestId: crypto.randomUUID(),
      mimeType: 'image/png',
      occurredAt,
    },
  )
  expect(created.statusCode).toBe(201)
  const list = await call(
    'GET',
    `/api/tickets/${ticketId}/evidence`,
    context.cookies.admin,
  )
  const item = (list.json() as { items: Array<{ occurredAt: string }> })
    .items[0]
  expect(item?.occurredAt).toBe(occurredAt)
})

it('rejects a correction outside the ticket or its neighbours', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const comment = await call(
    'POST',
    `/api/tickets/${ticketId}/actions`,
    context.cookies.admin,
    {
      action: 'comment',
      text: 'Comentario para límites',
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(comment.statusCode).toBe(200)
  const target = (await timeline(ticketId)).findLast(
    (item) => item.type === 'comment',
  )

  const future = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${target?.id}/time`,
    context.cookies.admin,
    { occurredAt: new Date(Date.now() + 3600_000).toISOString() },
  )
  expect(future.statusCode).toBe(400)

  const beforeStart = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${target?.id}/time`,
    context.cookies.admin,
    { occurredAt: minutesAgo(90) },
  )
  expect(beforeStart.statusCode).toBe(400)
})

it('applies a manual time from the offline sync contract', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const occurredAt = minutesAgo(20)
  const subjectTechnicianId = await technicianId()
  const response = await call(
    'POST',
    '/api/sync/actions',
    context.cookies.admin,
    {
      items: [
        {
          clientRequestId: crypto.randomUUID(),
          ticketId,
          type: 'recapture',
          args: {
            changes: { description: 'Acción con hora desde sync' },
            subjectTechnicianId,
          },
          occurredAt,
          manualTime: true,
        },
      ],
    },
  )
  expect(response.statusCode).toBe(200)
  expect(
    (response.json() as { results: Array<{ status: string }> }).results[0]
      ?.status,
  ).toBe('applied')
  expect(
    (await timeline(ticketId)).findLast(
      (item) => item.type === 'capture_recaptured',
    )?.occurredAt,
  ).toBe(occurredAt)
})

it('does not allow a requester to backdate or correct an action', async () => {
  const ticketId = await createTicketAt(minutesAgo(60))
  const backdated = await call(
    'POST',
    `/api/tickets/${ticketId}/actions`,
    context.cookies.requester,
    {
      action: 'comment',
      text: 'Intento sin permiso',
      occurredAt: minutesAgo(30),
      clientRequestId: crypto.randomUUID(),
    },
  )
  expect(backdated.statusCode).toBe(403)

  const created = (await timeline(ticketId))[0]
  const correction = await call(
    'PATCH',
    `/api/tickets/${ticketId}/events/${created?.id}/time`,
    context.cookies.requester,
    { occurredAt: minutesAgo(50) },
  )
  expect(correction.statusCode).toBe(403)
})
