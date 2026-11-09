import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'

import {
  action,
  attendedTicket,
  createAccount,
  ownAccount,
  ownAttended,
  setPolicy,
  setupValidationContext,
  ticketStatus,
  type Account,
} from './tickets-validation-sides-helpers.js'
import {
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import type { WriteRefs } from './tickets-write-helpers.js'

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

it('la misma cuenta valida los dos lados en política both y cierra', async () => {
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  const requester = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId: randomUUID(),
  })
  const supervisor = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })

  expect(requester.statusCode).toBe(200)
  expect(supervisor.statusCode).toBe(200)
  expect(await ticketStatus(context, ticketId)).toBe('closed')
})

it('repetir un lado responde 409 y no cambia el estado', async () => {
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  const first = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId: randomUUID(),
  })
  const second = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId: randomUUID(),
  })

  expect(first.statusCode).toBe(200)
  expect(second.statusCode).toBe(409)
  expect(await ticketStatus(context, ticketId)).toBe('attended')
})

it('el lado del supervisor antes del solicitante responde 409', async () => {
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  const supervisor = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })

  expect(supervisor.statusCode).toBe(409)
  expect(await ticketStatus(context, ticketId)).toBe('attended')
})

it('la política supervisor registra solo el lado del supervisor', async () => {
  await setPolicy(context, 'supervisor')
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  const supervisor = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })
  const rows = await context.db.execute(sql`
    select validator_role from public.ticket_validations
    where ticket_id = ${ticketId}
  `)

  expect(supervisor.statusCode).toBe(200)
  expect(await ticketStatus(context, ticketId)).toBe('closed')
  expect(rows.rows).toEqual([{ validator_role: 'supervisor' }])
})

it('la política requester rechaza el lado del supervisor', async () => {
  await setPolicy(context, 'requester')
  const account = await accountBoth()
  const ticketId = await ownAttended(context, refs, account)

  const rejected = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })
  const requester = await action(context, account.cookie, ticketId, {
    action: 'validate',
    role: 'requester',
    clientRequestId: randomUUID(),
  })

  expect(rejected.statusCode).toBe(403)
  expect(requester.statusCode).toBe(200)
  expect(await ticketStatus(context, ticketId)).toBe('closed')
})

it('una cuenta solo solicitante no puede validar el lado del supervisor', async () => {
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

  const supervisor = await action(context, requester.cookie, ticketId, {
    action: 'validate',
    role: 'supervisor',
    clientRequestId: randomUUID(),
  })

  expect(supervisor.statusCode).toBe(403)
  expect(await ticketStatus(context, ticketId)).toBe('attended')
})

it('una cuenta solo supervisora valida el solicitante a nombre del solicitante', async () => {
  const ticketId = await attendedTicket(context, refs, {
    creatorCookie: context.cookies.requester,
    requesterId: refs.requesterId,
    supervisorCookie: context.cookies.supervisor,
    technicianId: refs.technicianId,
    workerCookie: context.cookies.technician,
  })

  const requester = await action(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'validate',
      role: 'requester',
      subjectRequesterId: refs.requesterId,
      clientRequestId: randomUUID(),
    },
  )
  const supervisor = await action(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    },
  )

  expect(requester.statusCode).toBe(200)
  expect(supervisor.statusCode).toBe(200)
  expect(await ticketStatus(context, ticketId)).toBe('closed')
})
