import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'

import {
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import type { WriteRefs } from './tickets-write-helpers.js'
import {
  action,
  attendedTicket,
  createAccount,
  ownAccount,
  ownAttended,
  setPolicy,
  setupValidationContext,
  ticketDetail,
  type Account,
} from './tickets-validation-sides-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let passwordHash: string

beforeAll(async () => {
  ;({ context, refs, passwordHash } = await setupValidationContext())
})

afterEach(async () => {
  await setPolicy(context, 'both')
})

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function accountBoth(): Promise<Account> {
  return ownAccount(context, passwordHash)
}

it('el detalle expone el estado de cada lado y las capacidades', async () => {
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  const before = await ticketDetail(context, account.cookie, ticketId)
  expect(before).toMatchObject({
    status: 'attended',
    requesterValidated: false,
    supervisorValidated: false,
    canValidateRequester: true,
    canValidateSupervisor: true,
  })

  await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId: randomUUID(),
  })
  const partial = await ticketDetail(context, account.cookie, ticketId)
  expect(partial).toMatchObject({
    status: 'attended',
    requesterValidated: true,
    supervisorValidated: false,
    canValidateSupervisor: true,
  })

  await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })
  const closed = await ticketDetail(context, account.cookie, ticketId)
  expect(closed).toMatchObject({
    status: 'closed',
    supervisorValidated: true,
  })
})

it('una cuenta solo solicitante no recibe la capacidad del supervisor', async () => {
  const requester = await createAccount(context, passwordHash, {
    username: `requester-${randomUUID()}`,
    roles: ['requester'],
    requester: true,
  })
  if (!requester.requesterId) throw new Error('Missing requester')
  const ticketId = await attendedTicket(context, refs, {
    creatorCookie: requester.cookie,
    requesterId: requester.requesterId,
    supervisorCookie: context.cookies.supervisor,
    technicianId: refs.technicianId,
    workerCookie: context.cookies.technician,
  })

  const detail = await ticketDetail(context, requester.cookie, ticketId)
  expect(detail).toMatchObject({
    canValidateRequester: true,
    canValidateSupervisor: false,
  })
})

it('la misma cuenta deja dos eventos y dos sujetos distintos', async () => {
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId: randomUUID(),
  })
  await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })

  const events = await context.db.execute(sql`
    select
      payload ->> 'role' as role,
      subject_requester_id,
      subject_user_id
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'validated'
    order by id
  `)

  expect(events.rows).toEqual([
    {
      role: 'requester',
      subject_requester_id: account.requesterId,
      subject_user_id: null,
    },
    {
      role: 'supervisor',
      subject_requester_id: null,
      subject_user_id: account.userId,
    },
  ])
})

it('repetir la misma petición es idempotente', async () => {
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)
  const clientRequestId = randomUUID()

  const first = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId,
  })
  const replay = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId,
  })
  const events = await context.db.execute(sql`
    select count(*)::int as total from public.ticket_events
    where ticket_id = ${ticketId} and client_request_id = ${clientRequestId}
  `)

  expect(first.statusCode).toBe(200)
  expect(replay.statusCode).toBe(200)
  expect((replay.json() as { replayed: boolean }).replayed).toBe(true)
  expect((events.rows[0] as { total: number }).total).toBe(1)
})
