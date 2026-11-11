import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  addEvidence,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let root: string
let stepA: string
let stepB: string
let exit: string
let otherExit: string

async function createReason(
  name: string,
  parentId: string | null,
  kind: 'progress' | 'exit' | null = null,
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.reasons (use, name, parent_id, pause_step_kind)
    values ('pause', ${name}, ${parentId}, ${kind}::public.pause_step_kind)
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

async function putFlow(rootId: string, edges: { from: string; to: string }[]) {
  return context.app.inject({
    method: 'PUT',
    url: `/api/admin/pause-flow/${rootId}`,
    headers: authHeaders(context.cookies.admin),
    payload: { edges },
  })
}

async function startedTicket(): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  const started = await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  expect(started.statusCode).toBe(200)
  return ticketId
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  root = await createReason('Flujo administrable', null)
  stepA = await createReason('Paso A', root)
  stepB = await createReason('Paso B', root)
  exit = await createReason('Salida administrable', root, 'exit')
  const seedExit = await context.db.execute(sql`
    select id from public.reasons
    where use = 'pause' and pause_step_kind = 'exit' and parent_id is not null
      and name <> 'Salida administrable'
    limit 1
  `)
  otherExit = (seedExit.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('lista los motivos con sus nodos y aristas', async () => {
  const response = await context.app.inject({
    method: 'GET',
    url: '/api/admin/pause-flow',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  const items = (response.json() as { items: { rootId: string }[] }).items
  expect(items.some((item) => item.rootId === root)).toBe(true)
})

it('reemplaza el flujo cuando es válido', async () => {
  const response = await putFlow(root, [
    { from: root, to: stepA },
    { from: stepA, to: stepB },
    { from: stepB, to: exit },
  ])
  expect(response.statusCode).toBe(204)
  const rows = await context.db.execute(sql`
      select count(*)::int as count from public.pause_transitions
      where from_reason_id in (${root}, ${stepA}, ${stepB})
        and to_reason_id in (${stepA}, ${stepB}, ${exit})
    `)
  expect((rows.rows[0] as { count: number }).count).toBe(3)
})

it('rechaza un paso sin siguiente o sin salida alcanzable', async () => {
  const response = await putFlow(root, [{ from: root, to: stepA }])
  expect(response.statusCode).toBe(400)
  expect(response.json()).toMatchObject({ error: { code: 'validation_error' } })
})

it('rechaza una salida con siguientes', async () => {
  const response = await putFlow(root, [
    { from: root, to: stepA },
    { from: stepA, to: exit },
    { from: exit, to: stepB },
  ])
  expect(response.statusCode).toBe(400)
})

it('rechaza un ciclo en el flujo', async () => {
  const response = await putFlow(root, [
    { from: root, to: stepA },
    { from: stepA, to: stepB },
    { from: stepB, to: stepA },
    { from: stepB, to: exit },
  ])
  expect(response.statusCode).toBe(400)
})

it('rechaza una arista hacia otro motivo', async () => {
  const response = await putFlow(root, [
    { from: root, to: stepA },
    { from: stepA, to: otherExit },
  ])
  expect(response.statusCode).toBe(400)
})

it('bloquea el cambio mientras hay una pausa abierta en el motivo', async () => {
  const ticketId = await startedTicket()
  expect(
    (
      await action(context, context.cookies.technician, ticketId, {
        action: 'pause',
        reasonId: root,
        clientRequestId: randomUUID(),
      })
    ).statusCode,
  ).toBe(200)
  const response = await putFlow(root, [
    { from: root, to: stepA },
    { from: stepA, to: stepB },
    { from: stepB, to: exit },
  ])
  expect(response.statusCode).toBe(409)
})
