import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import {
  action,
  attendedTicket,
  closedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function rejectionReasonId(): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = 'rejection' and parent_id is null
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

async function cancellationReasonId(): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = 'cancellation' and parent_id is null
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

async function claimReasonId(): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = 'claim' and parent_id is null
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

async function expectTerminalClosed(ticketId: string): Promise<void> {
  const result = await context.db.execute(sql`
    select
      t.closed_at,
      (
        select count(*)::int from public.ticket_participants p
        where p.ticket_id = t.id and p.ended_at is null
      ) as open_participants,
      (
        select count(*)::int from public.ticket_assignments a
        where a.ticket_id = t.id
          and a.stage = 'technician' and a.ended_at is null
      ) as open_assignments,
      (
        select count(*)::int from public.ticket_participants p
        where p.ticket_id = t.id
          and p.ended_at is not null
          and abs(extract(epoch from (p.ended_at - t.closed_at))) > 1
      ) as misaligned
    from public.tickets t
    where t.id = ${ticketId}
  `)
  const row = result.rows[0] as {
    closed_at: Date | string | null
    open_participants: number
    open_assignments: number
    misaligned: number
  }
  expect(row.closed_at).not.toBeNull()
  expect(row).toMatchObject({
    open_participants: 0,
    open_assignments: 0,
    misaligned: 0,
  })
}

it('elimina el trigger que cerraba participaciones con now()', async () => {
  const result = await context.db.execute(sql`
    select count(*)::int as count
    from pg_trigger
    where tgname = 'tickets_close_participants'
  `)
  expect((result.rows[0] as { count: number }).count).toBe(0)
})

it('cierra participaciones y asignaciones al validar', async () => {
  const ticketId = await closedTicket(context, refs)
  await expectTerminalClosed(ticketId)
})

it('cierra participaciones y asignaciones al rechazar', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  const rejected = await action(context, context.cookies.supervisor, ticketId, {
    action: 'reject',
    reasonId: await rejectionReasonId(),
    clientRequestId: randomUUID(),
  })
  expect(rejected.statusCode).toBe(200)
  await expectTerminalClosed(ticketId)
})

it('cierra participaciones y asignaciones al cancelar', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  const cancelled = await action(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'cancel',
      reasonId: await cancellationReasonId(),
      clientRequestId: randomUUID(),
    },
  )
  expect(cancelled.statusCode).toBe(200)
  await expectTerminalClosed(ticketId)
})

it('cierra participaciones y asignaciones al marcar un duplicado', async () => {
  const originalId = await attendedTicket(context, refs)
  const ticketId = await attendedTicket(context, refs)
  const marked = await action(context, context.cookies.technician, ticketId, {
    action: 'mark_duplicate',
    originalId,
    clientRequestId: randomUUID(),
  })
  expect(marked.statusCode).toBe(200)
  await expectTerminalClosed(ticketId)
})

it('cierra participaciones y asignaciones al descartar una reclamación', async () => {
  const ticketId = await attendedTicket(context, refs)
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
  const opened = await action(context, context.cookies.requester, ticketId, {
    action: 'open_claim',
    reasonId: await claimReasonId(),
    description: 'La falla continúa',
    clientRequestId: randomUUID(),
  })
  expect(opened.statusCode).toBe(200)
  const resolved = await action(context, context.cookies.supervisor, ticketId, {
    action: 'resolve_claim',
    resolution: 'dismissed',
    clientRequestId: randomUUID(),
  })
  expect(resolved.statusCode).toBe(200)
  await expectTerminalClosed(ticketId)
})

it('no deja participaciones del ciclo anterior al reabrir', async () => {
  const ticketId = await attendedTicket(context, refs)
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
  const opened = await action(context, context.cookies.requester, ticketId, {
    action: 'open_claim',
    reasonId: await claimReasonId(),
    description: 'La falla continúa',
    clientRequestId: randomUUID(),
  })
  expect(opened.statusCode).toBe(200)
  const resolved = await action(context, context.cookies.supervisor, ticketId, {
    action: 'resolve_claim',
    resolution: 'upheld',
    clientRequestId: randomUUID(),
  })
  expect(resolved.statusCode).toBe(200)

  const stale = await context.db.execute(sql`
    select count(*)::int as count from public.ticket_participants
    where ticket_id = ${ticketId} and cycle < 2 and ended_at is null
  `)
  expect((stale.rows[0] as { count: number }).count).toBe(0)
  const reopened = await context.db.execute(sql`
    select count(*)::int as count from public.ticket_participants
    where ticket_id = ${ticketId} and cycle = 2 and ended_at is null
  `)
  expect((reopened.rows[0] as { count: number }).count).toBe(1)
})
