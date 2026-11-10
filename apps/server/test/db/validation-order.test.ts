import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { attendedTicket } from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
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

async function seedCrossedValidations(ticketId: string) {
  const attended = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = 'attended'
    limit 1
  `)
  const attendedAt = new Date(
    (attended.rows[0] as { occurred_at: Date | string }).occurred_at,
  ).getTime()
  const requesterAt = new Date(attendedAt + 10 * 60_000).toISOString()
  const supervisorAt = new Date(attendedAt + 20 * 60_000).toISOString()

  await context.db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, payload, occurred_at
    ) values
      (${ticketId}, 1, 'validated', ${context.people.requesterUserId},
        '{"role":"requester"}'::jsonb, ${requesterAt}),
      (${ticketId}, 1, 'validated', ${context.people.supervisorUserId},
        '{"role":"supervisor"}'::jsonb, ${supervisorAt})
  `)
  await context.db.execute(sql`
    insert into public.ticket_validations (
      ticket_id, cycle, validator_user_id, validator_role, validated_at
    ) values
      (${ticketId}, 1, ${context.people.requesterUserId}, 'requester',
        ${supervisorAt}),
      (${ticketId}, 1, ${context.people.supervisorUserId}, 'supervisor',
        ${requesterAt})
  `)
  await context.db.execute(sql`
    update public.tickets
    set status = 'closed', closed_at = ${supervisorAt}
    where id = ${ticketId}
  `)
  await context.db.execute(
    sql`select public.rebuild_ticket_time_spans(${ticketId})`,
  )
}

it('atribuye la validación por orden de eventos, no por validated_at', async () => {
  const ticketId = await attendedTicket(context, refs)
  await seedCrossedValidations(ticketId)

  const spans = await context.db.execute(sql`
    select subject_user_id, subject_requester_id, started_at
    from public.time_spans
    where ticket_id = ${ticketId} and kind = 'validation'
    order by started_at
  `)
  const rows = spans.rows as Array<{
    subject_user_id: string | null
    subject_requester_id: string | null
  }>
  const expected = await context.db.execute(sql`
    select t.requester_id,
      (
        select a.assignee_user_id from public.ticket_assignments a
        where a.ticket_id = t.id
          and a.stage = 'supervisor' and a.ended_at is null
        order by a.assigned_at desc limit 1
      ) as supervisor_user_id
    from public.tickets t
    where t.id = ${ticketId}
  `)
  const row = expected.rows[0] as {
    requester_id: string
    supervisor_user_id: string
  }
  expect(rows).toHaveLength(2)
  expect(rows[0]?.subject_requester_id).toBe(row.requester_id)
  expect(rows[1]?.subject_user_id).toBe(row.supervisor_user_id)
})
