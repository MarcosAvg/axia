import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { closedTicket } from './tickets-lifecycle-helpers.js'
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

it('mantiene la cobertura y evita duraciones negativas en un ciclo completo', async () => {
  const ticketId = await closedTicket(context, refs)

  const coverage = await context.db.execute(sql`
    select total_time, phase_time, delta
    from public.v_ticket_phase_coverage
    where id = ${ticketId}
  `)
  expect(coverage.rows[0]).toMatchObject({ delta: '00:00:00' })

  const negative = await context.db.execute(sql`
    select
      (select count(*)::int from public.ticket_participants
        where ticket_id = ${ticketId} and ended_at < started_at)
        as participants,
      (select count(*)::int from public.ticket_pauses
        where ticket_id = ${ticketId} and closed_at < opened_at)
        as pauses,
      (select count(*)::int from public.ticket_pause_steps s
        join public.ticket_pauses p on p.id = s.pause_id
        where p.ticket_id = ${ticketId} and s.exited_at < s.entered_at)
        as pause_steps,
      (select count(*)::int from public.ticket_assignments
        where ticket_id = ${ticketId} and ended_at < assigned_at)
        as assignments
  `)
  expect(negative.rows[0]).toMatchObject({
    participants: 0,
    pauses: 0,
    pause_steps: 0,
    assignments: 0,
  })
})
