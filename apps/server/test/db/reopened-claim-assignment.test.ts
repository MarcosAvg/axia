import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  attendedTicket,
  closedTicket,
} from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { lastEventId, reasonId } from './time-links-helpers.js'
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

async function claimEvidence(ticketId: string) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
}

async function openAndUphold(ticketId: string, opener: string) {
  await claimEvidence(ticketId)
  const opened = await action(context, opener, ticketId, {
    action: 'open_claim',
    reasonId: await reasonId(context, 'claim'),
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
}

async function openAssignments(ticketId: string) {
  const result = await context.db.execute(sql`
    select cycle, assignee_technician_id, assigned_event_id
    from public.ticket_assignments
    where ticket_id = ${ticketId}
      and stage = 'technician' and ended_at is null
  `)
  return result.rows as Array<{
    cycle: number
    assignee_technician_id: string
    assigned_event_id: string | number | null
  }>
}

it('recrea la asignación del mismo técnico al reabrir desde cerrado', async () => {
  const ticketId = await closedTicket(context, refs)
  await openAndUphold(ticketId, context.cookies.supervisor)

  const assignments = await openAssignments(ticketId)
  expect(assignments).toHaveLength(1)
  expect(assignments[0]).toMatchObject({
    cycle: 2,
    assignee_technician_id: refs.technicianId,
  })
  const reopenedEvent = await lastEventId(context, ticketId, 'reopened')
  expect(String(assignments[0]?.assigned_event_id)).toBe(reopenedEvent)

  const participant = await context.db.execute(sql`
    select cycle, technician_id from public.ticket_participants
    where ticket_id = ${ticketId} and ended_at is null
  `)
  expect(participant.rows).toHaveLength(1)
  expect(participant.rows[0]).toMatchObject({
    cycle: 2,
    technician_id: refs.technicianId,
  })
})

it('no duplica la asignación cuando la reclamación viene de atendido', async () => {
  const ticketId = await attendedTicket(context, refs)
  await openAndUphold(ticketId, context.cookies.requester)

  const assignments = await openAssignments(ticketId)
  expect(assignments).toHaveLength(1)
  expect(assignments[0]?.assignee_technician_id).toBe(refs.technicianId)
})
