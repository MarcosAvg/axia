import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { appConnectionString } from './helpers.js'
import {
  action as runAction,
  addEvidence as addTicketEvidence,
  createTicket as createLifecycleTicket,
  takeAndAssign as takeAndAssignTicket,
  unlinkedTicket as createUnlinkedTicket,
} from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

const createTicket = () => createLifecycleTicket(context, refs)
const action = (
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) => runAction(context, cookie, ticketId, payload)
const takeAndAssign = (ticketId: string) =>
  takeAndAssignTicket(context, refs, ticketId)
const addEvidence = (ticketId: string, type: 'before' | 'after') =>
  addTicketEvidence(context, refs, ticketId, type)
const unlinkedTicket = () => createUnlinkedTicket(context, refs)

beforeAll(async () => {
  context = await buildTicketHttpApp({
    runtimeConnectionString: appConnectionString(),
  })
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('start and attend', () => {
  it('requires evidence for start and attend', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)

    const start = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(start.statusCode).toBe(409)

    await addEvidence(ticketId, 'before')
    const started = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(started.statusCode).toBe(200)

    const attend = await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Se reparó la fuga',
      clientRequestId: randomUUID(),
    })
    expect(attend.statusCode).toBe(409)

    await addEvidence(ticketId, 'after')
    const attended = await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Se reparó la fuga',
      clientRequestId: randomUUID(),
    })
    expect(attended.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((ticket.rows[0] as { status: string }).status).toBe('attended')
  })

  it('does not accept evidence that was never uploaded', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id, processing_state
      ) values (${ticketId}, 1, 'before', ${refs.technicianId}, 'pending')
    `)

    const response = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(409)
  })

  it('rejects start on a ticket that is not assigned', async () => {
    const ticketId = await createTicket()
    const response = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('validation policy', () => {
  it('closes only after both requester and supervisor validate', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await addEvidence(ticketId, 'before')
    await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    await addEvidence(ticketId, 'after')
    await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Trabajo terminado',
      clientRequestId: randomUUID(),
    })

    const requester = await action(context.cookies.requester, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(requester.statusCode).toBe(200)
    const partial = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((partial.rows[0] as { status: string }).status).toBe('attended')

    const repeated = await action(context.cookies.requester, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(repeated.statusCode).toBe(409)

    const supervisor = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(supervisor.statusCode).toBe(200)
    const closed = await context.db.execute(sql`
      select status, closed_at from public.tickets where id = ${ticketId}
    `)
    expect(closed.rows[0]).toMatchObject({ status: 'closed' })
    expect(
      (closed.rows[0] as { closed_at: Date | null }).closed_at,
    ).not.toBeNull()
  })
})

describe('validation order', () => {
  it('requiere el lado del solicitante antes de validar como supervisor', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await addEvidence(ticketId, 'before')
    await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    await addEvidence(ticketId, 'after')
    await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Trabajo terminado',
      clientRequestId: randomUUID(),
    })

    const tooSoon = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(tooSoon.statusCode).toBe(409)

    const proxy = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      subjectRequesterId: refs.requesterId,
      clientRequestId: randomUUID(),
    })
    expect(proxy.statusCode).toBe(200)

    const own = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(own.statusCode).toBe(200)
  })
})

describe('validation without an account', () => {
  it('fills the requester side for a requester without an account', async () => {
    const ticketId = await unlinkedTicket()
    await takeAndAssign(ticketId)
    await addEvidence(ticketId, 'before')
    await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    await addEvidence(ticketId, 'after')
    await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Trabajo terminado',
      clientRequestId: randomUUID(),
    })

    const requesterRow = await context.db.execute(sql`
      select requester_id from public.tickets where id = ${ticketId}
    `)
    const requesterId = (requesterRow.rows[0] as { requester_id: string })
      .requester_id
    const requesterSide = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      subjectRequesterId: requesterId,
      clientRequestId: randomUUID(),
    })
    expect(requesterSide.statusCode).toBe(200)
    const attended = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((attended.rows[0] as { status: string }).status).toBe('attended')

    const supervisorSide = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(supervisorSide.statusCode).toBe(200)
    const closed = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((closed.rows[0] as { status: string }).status).toBe('closed')

    const roles = await context.db.execute(sql`
      select validator_role from public.ticket_validations
      where ticket_id = ${ticketId}
      order by validator_role
    `)
    expect(roles.rows).toEqual([
      { validator_role: 'requester' },
      { validator_role: 'supervisor' },
    ])
  })
})
