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
let pauseRoot: string
let pauseChild: string

function ticketBody() {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: `Tiquet de pausa ${randomUUID()}`,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
}

async function createStartedTicket() {
  const created = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(),
  })
  const ticketId = (created.json() as { ticket: { id: string } }).ticket.id
  const take = await action(context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(take.statusCode).toBe(200)
  const assign = await action(context.cookies.supervisor, ticketId, {
    action: 'assign_technician',
    technicianId: refs.technicianId,
    clientRequestId: randomUUID(),
  })
  expect(assign.statusCode).toBe(200)
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'before', ${refs.technicianId}, 'ready')
  `)
  const start = await action(context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  expect(start.statusCode).toBe(200)
  return ticketId
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

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const root = await context.db.execute(sql`
    insert into public.reasons (use, name) values ('pause', 'Pausa raíz')
    returning id
  `)
  pauseRoot = (root.rows[0] as { id: string }).id
  const child = await context.db.execute(sql`
    insert into public.reasons (use, name, parent_id)
    values ('pause', 'Pausa hija', ${pauseRoot})
    returning id
  `)
  pauseChild = (child.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('pause flow', () => {
  it('pauses, advances the substate and resumes', async () => {
    const ticketId = await createStartedTicket()

    const pause = await action(context.cookies.supervisor, ticketId, {
      action: 'pause',
      reasonId: pauseRoot,
      note: 'Esperando refacción',
      clientRequestId: randomUUID(),
    })
    expect(pause.statusCode).toBe(200)

    const paused = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((paused.rows[0] as { status: string }).status).toBe('paused')

    const advance = await action(context.cookies.supervisor, ticketId, {
      action: 'advance_pause',
      reasonId: pauseChild,
      note: 'Refacción solicitada',
      clientRequestId: randomUUID(),
    })
    expect(advance.statusCode).toBe(200)

    const resumed = await action(context.cookies.supervisor, ticketId, {
      action: 'resume',
      reasonId: pauseChild,
      clientRequestId: randomUUID(),
    })
    expect(resumed.statusCode).toBe(200)

    const result = await context.db.execute(sql`
      select
        t.status,
        count(s.id)::int as steps,
        bool_and(s.exited_at is not null) as steps_closed,
        bool_and(p.closed_at is not null) as pause_closed
      from public.tickets t
      join public.ticket_pauses p on p.ticket_id = t.id
      join public.ticket_pause_steps s on s.pause_id = p.id
      where t.id = ${ticketId}
      group by t.status, p.closed_at
    `)
    expect(result.rows[0]).toMatchObject({
      status: 'in_progress',
      steps: 2,
      steps_closed: true,
      pause_closed: true,
    })
  })
})

describe('pause validation', () => {
  it('rejects a pause without active substates without changing the ticket', async () => {
    const ticketId = await createStartedTicket()
    const root = await context.db.execute(sql`
      insert into public.reasons (use, name) values ('pause', 'Sin salida') returning id
    `)
    const rootId = (root.rows[0] as { id: string }).id
    await context.db.execute(sql`
      insert into public.reasons (use, name, parent_id, active)
      values ('pause', 'Salida inactiva', ${rootId}, false)
    `)
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'pause',
      reasonId: rootId,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
    const result = await context.db.execute(sql`
      select status, (select count(*)::int from public.ticket_pauses where ticket_id = ${ticketId}) as pauses
      from public.tickets where id = ${ticketId}
    `)
    expect(result.rows[0]).toMatchObject({ status: 'in_progress', pauses: 0 })
  })

  it('rejects a root reason as a resume substate', async () => {
    const ticketId = await createStartedTicket()
    await action(context.cookies.supervisor, ticketId, {
      action: 'pause',
      reasonId: pauseRoot,
      clientRequestId: randomUUID(),
    })
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'resume',
      reasonId: pauseRoot,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('preconfigured pause paths', () => {
  it('can pause and resume with every preconfigured root', async () => {
    const ticketId = await createStartedTicket()
    const reasons = await context.db.execute(sql`
      select root.id, root.name,
        (select child.id from public.reasons child
         where child.parent_id = root.id and child.active order by child.name limit 1) as child_id
      from public.reasons root
      where root.use = 'pause' and root.parent_id is null and root.active
        and root.id <> ${pauseRoot} and root.name <> 'Sin salida'
    `)
    expect(reasons.rows).toHaveLength(10)
    for (const row of reasons.rows as {
      id: string
      name: string
      child_id: string | null
    }[]) {
      expect(row.child_id, row.name).not.toBeNull()
      const paused = await action(context.cookies.supervisor, ticketId, {
        action: 'pause',
        reasonId: row.id,
        clientRequestId: randomUUID(),
      })
      expect(paused.statusCode, row.name).toBe(200)
      const resumed = await action(context.cookies.supervisor, ticketId, {
        action: 'resume',
        reasonId: row.child_id,
        clientRequestId: randomUUID(),
      })
      expect(resumed.statusCode, row.name).toBe(200)
    }
  })
})
