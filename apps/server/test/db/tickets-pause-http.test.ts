import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  insertPauseEdge,
  insertPauseReason,
  pauseAction,
  pauseCurrentTicket,
  startedTicketForPause,
} from './pause-http-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let pauseRoot: string
let pauseChild: string
let pauseExit: string
let altChild: string
let altExit: string

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  pauseRoot = await insertPauseReason(context, { name: 'Pausa raíz' })
  pauseChild = await insertPauseReason(context, {
    name: 'Pausa hija',
    parentId: pauseRoot,
  })
  pauseExit = await insertPauseReason(context, {
    name: 'Pausa resuelta',
    parentId: pauseRoot,
    kind: 'exit',
  })
  altChild = await insertPauseReason(context, {
    name: 'Pausa alternativa',
    parentId: pauseRoot,
  })
  altExit = await insertPauseReason(context, {
    name: 'Salida alternativa',
    parentId: pauseRoot,
    kind: 'exit',
  })
  await insertPauseEdge(context, pauseRoot, pauseChild)
  await insertPauseEdge(context, pauseChild, pauseExit)
  await insertPauseEdge(context, pauseRoot, altChild)
  await insertPauseEdge(context, altChild, altExit)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('pausa, avanza el subestado y reanuda con la salida', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  expect(
    (await pauseCurrentTicket(context, ticketId, pauseRoot)).statusCode,
  ).toBe(200)

  const paused = await context.db.execute(sql`
    select status from public.tickets where id = ${ticketId}
  `)
  expect((paused.rows[0] as { status: string }).status).toBe('paused')

  expect(
    (
      await pauseAction(context, context.cookies.supervisor, ticketId, {
        action: 'advance_pause',
        reasonId: pauseChild,
        note: 'Refacción solicitada',
        clientRequestId: randomUUID(),
      })
    ).statusCode,
  ).toBe(200)
  expect(
    (
      await pauseAction(context, context.cookies.supervisor, ticketId, {
        action: 'resume',
        reasonId: pauseExit,
        clientRequestId: randomUUID(),
      })
    ).statusCode,
  ).toBe(200)

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

it('rechaza un paso de avance como salida al reanudar', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  expect(
    (await pauseCurrentTicket(context, ticketId, pauseRoot)).statusCode,
  ).toBe(200)
  expect(
    (
      await pauseAction(context, context.cookies.supervisor, ticketId, {
        action: 'advance_pause',
        reasonId: pauseChild,
        clientRequestId: randomUUID(),
      })
    ).statusCode,
  ).toBe(200)

  const response = await pauseAction(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'resume',
      reasonId: pauseChild,
      clientRequestId: randomUUID(),
    },
  )
  expect(response.statusCode).toBe(400)
})

it('rechaza una salida como siguiente paso', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  expect(
    (await pauseCurrentTicket(context, ticketId, pauseRoot)).statusCode,
  ).toBe(200)
  expect(
    (
      await pauseAction(context, context.cookies.supervisor, ticketId, {
        action: 'advance_pause',
        reasonId: pauseChild,
        clientRequestId: randomUUID(),
      })
    ).statusCode,
  ).toBe(200)

  const response = await pauseAction(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'advance_pause',
      reasonId: pauseExit,
      clientRequestId: randomUUID(),
    },
  )
  expect(response.statusCode).toBe(400)
})

it('rechaza un nodo que no está conectado desde el subestado actual', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  expect(
    (await pauseCurrentTicket(context, ticketId, pauseRoot)).statusCode,
  ).toBe(200)

  const response = await pauseAction(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'advance_pause',
      reasonId: altExit,
      clientRequestId: randomUUID(),
    },
  )
  expect(response.statusCode).toBe(400)
})

it('solo ofrece la salida de la rama actual', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  expect(
    (await pauseCurrentTicket(context, ticketId, pauseRoot)).statusCode,
  ).toBe(200)
  expect(
    (
      await pauseAction(context, context.cookies.supervisor, ticketId, {
        action: 'advance_pause',
        reasonId: pauseChild,
        clientRequestId: randomUUID(),
      })
    ).statusCode,
  ).toBe(200)

  const wrong = await pauseAction(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'resume',
      reasonId: altExit,
      clientRequestId: randomUUID(),
    },
  )
  expect(wrong.statusCode).toBe(400)

  const correct = await pauseAction(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'resume',
      reasonId: pauseExit,
      clientRequestId: randomUUID(),
    },
  )
  expect(correct.statusCode).toBe(200)
})

it('rechaza una pausa sin una salida activa alcanzable', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  const root = await insertPauseReason(context, { name: 'Sin salida' })
  await context.db.execute(sql`
    insert into public.reasons (use, name, parent_id, active)
    values ('pause', 'Salida inactiva', ${root}, false)
  `)
  expect((await pauseCurrentTicket(context, ticketId, root)).statusCode).toBe(
    400,
  )
  const result = await context.db.execute(sql`
    select status, (select count(*)::int from public.ticket_pauses where ticket_id = ${ticketId}) as pauses
    from public.tickets where id = ${ticketId}
  `)
  expect(result.rows[0]).toMatchObject({ status: 'in_progress', pauses: 0 })
})

it('rechaza la raíz como salida al reanudar', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  expect(
    (await pauseCurrentTicket(context, ticketId, pauseRoot)).statusCode,
  ).toBe(200)
  const response = await pauseAction(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'resume',
      reasonId: pauseRoot,
      clientRequestId: randomUUID(),
    },
  )
  expect(response.statusCode).toBe(400)
})
