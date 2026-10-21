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
let rejectionReason: string
let cancellationReason: string
let reactivationReason: string
let highPriority: string

function ticketBody(description = 'Tiquet para descartes') {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
}

async function createTicket() {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(`Tiquet ${randomUUID()}`),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function action(
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: authHeaders(cookie),
    payload,
  })
}

async function createReason(use: string, name: string): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.reasons (use, name) values (${use}, ${name}) returning id
  `)
  return (result.rows[0] as { id: string }).id
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  rejectionReason = await createReason('rejection', 'Rechazo de prueba')
  cancellationReason = await createReason(
    'cancellation',
    'Cancelación de prueba',
  )
  reactivationReason = await createReason(
    'reactivation',
    'Reactivación de prueba',
  )
  const priority = await context.db.execute(sql`
    insert into public.priorities (name, position) values ('Alta prueba', 1)
    returning id
  `)
  highPriority = (priority.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('reject and cancel', () => {
  it('cancels and reactivates a ticket', async () => {
    const ticketId = await createTicket()
    const cancel = await action(context.cookies.requester, ticketId, {
      action: 'cancel',
      reasonId: cancellationReason,
      note: 'Ya no se requiere',
      clientRequestId: randomUUID(),
    })
    expect(cancel.statusCode).toBe(200)

    const cancelled = await context.db.execute(sql`
      select status, status_before_discard
      from public.tickets where id = ${ticketId}
    `)
    expect(cancelled.rows[0]).toMatchObject({
      status: 'cancelled',
      status_before_discard: 'registered',
    })

    const reactivate = await action(context.cookies.admin, ticketId, {
      action: 'reactivate',
      reasonId: reactivationReason,
      clientRequestId: randomUUID(),
    })
    expect(reactivate.statusCode).toBe(200)
    const active = await context.db.execute(sql`
      select status, status_before_discard
      from public.tickets where id = ${ticketId}
    `)
    expect(active.rows[0]).toMatchObject({
      status: 'registered',
      status_before_discard: null,
    })
  })
})

describe('reject and cancel validation', () => {
  it('rejects as the assigned technician', async () => {
    const ticketId = await createTicket()
    await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: refs.technicianId,
      clientRequestId: randomUUID(),
    })

    const response = await action(context.cookies.technician, ticketId, {
      action: 'reject',
      reasonId: rejectionReason,
      note: 'No corresponde',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)
    const ticket = await context.db.execute(sql`
      select status, status_before_discard
      from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({
      status: 'rejected',
      status_before_discard: 'assigned',
    })
  })

  it('rejects a reason with the wrong use', async () => {
    const ticketId = await createTicket()
    const response = await action(context.cookies.requester, ticketId, {
      action: 'cancel',
      reasonId: rejectionReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('duplicates, comments and priority', () => {
  it('marks a duplicate and links the original', async () => {
    const originalId = await createTicket()
    const duplicateId = await createTicket()
    const response = await action(context.cookies.requester, duplicateId, {
      action: 'mark_duplicate',
      originalId,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status, duplicate_of_id from public.tickets where id = ${duplicateId}
    `)
    expect(ticket.rows[0]).toMatchObject({
      status: 'duplicate',
      duplicate_of_id: originalId,
    })
    const link = await context.db.execute(sql`
      select link_type from public.ticket_links where ticket_id = ${duplicateId}
    `)
    expect(link.rows[0]).toMatchObject({ link_type: 'duplicate_of' })
  })

  it('adds comments and changes priority', async () => {
    const ticketId = await createTicket()
    const comment = await action(context.cookies.requester, ticketId, {
      action: 'comment',
      text: 'Comentario de prueba',
      clientRequestId: randomUUID(),
    })
    expect(comment.statusCode).toBe(200)

    const priority = await action(context.cookies.supervisor, ticketId, {
      action: 'change_priority',
      priorityId: highPriority,
      clientRequestId: randomUUID(),
    })
    expect(priority.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select priority_id from public.tickets where id = ${ticketId}
    `)
    expect((ticket.rows[0] as { priority_id: string }).priority_id).toBe(
      highPriority,
    )
    const event = await context.db.execute(sql`
      select type from public.ticket_events
      where ticket_id = ${ticketId} and type = 'comment'
    `)
    expect(event.rows).toHaveLength(1)
  })
})
