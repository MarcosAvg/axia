import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  atMinutesAgo,
  claimReasonId,
  createTicketAt,
  eventTime,
  offline,
  offlineAttendedTicket,
  timestamp,
} from './business-times-helpers.js'
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

it('alinea ofertas, asignaciones y participaciones con la hora offline', async () => {
  const ticketId = await createTicketAt(context, refs, 60)
  const takenAt = atMinutesAgo(50)
  const assignedAt = atMinutesAgo(40)
  await offline(context, {
    cookie: context.cookies.supervisor,
    ticketId,
    type: 'take',
    reportedAt: takenAt,
  })
  await offline(context, {
    cookie: context.cookies.supervisor,
    ticketId,
    type: 'assign_technician',
    args: { technicianId: refs.technicianId },
    reportedAt: assignedAt,
  })

  const offer = await context.db.execute(sql`
    select resolved_at from public.ticket_offers
    where ticket_id = ${ticketId}
      and supervisor_user_id = (
        select id from public.users where username = 'supervisor-access'
      )
  `)
  expect(
    timestamp((offer.rows[0] as { resolved_at: Date | string }).resolved_at),
  ).toBe(takenAt)

  const assignments = await context.db.execute(sql`
    select stage, assigned_at from public.ticket_assignments
    where ticket_id = ${ticketId}
  `)
  const assignedByStage = new Map(
    assignments.rows.map((row) => {
      const item = row as { stage: string; assigned_at: Date | string }
      return [item.stage, timestamp(item.assigned_at)]
    }),
  )
  expect(assignedByStage.get('supervisor')).toBe(takenAt)
  expect(assignedByStage.get('technician')).toBe(assignedAt)

  const participants = await context.db.execute(sql`
    select started_at from public.ticket_participants
    where ticket_id = ${ticketId}
    order by started_at
    limit 1
  `)
  expect(
    timestamp(
      (participants.rows[0] as { started_at: Date | string }).started_at,
    ),
  ).toBe(assignedAt)
  expect(await eventTime(context, ticketId, 'taken')).toBe(takenAt)
  expect(await eventTime(context, ticketId, 'assigned_technician')).toBe(
    assignedAt,
  )
})

it('registra las validaciones con la hora de su evento', async () => {
  const ticketId = await offlineAttendedTicket(context, refs)
  const requesterAt = atMinutesAgo(60)
  const supervisorAt = atMinutesAgo(50)
  await offline(context, {
    cookie: context.cookies.requester,
    ticketId,
    type: 'validate',
    reportedAt: requesterAt,
  })
  await offline(context, {
    cookie: context.cookies.supervisor,
    ticketId,
    type: 'validate',
    reportedAt: supervisorAt,
  })

  const validations = await context.db.execute(sql`
    select validator_role, validated_at from public.ticket_validations
    where ticket_id = ${ticketId}
    order by validated_at
  `)
  expect(
    validations.rows.map((row) => {
      const item = row as {
        validator_role: string
        validated_at: Date | string
      }
      return [item.validator_role, timestamp(item.validated_at)]
    }),
  ).toEqual([
    ['requester', requesterAt],
    ['supervisor', supervisorAt],
  ])

  const events = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = 'validated'
    order by occurred_at
  `)
  expect(
    events.rows.map((row) =>
      timestamp((row as { occurred_at: Date | string }).occurred_at),
    ),
  ).toEqual([requesterAt, supervisorAt])
})

async function openOfflineClaim(
  ticketId: string,
  openedAt: string,
): Promise<void> {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state,
      occurred_at
    ) values (
      ${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready', ${openedAt}
    )
  `)
  await offline(context, {
    cookie: context.cookies.requester,
    ticketId,
    type: 'open_claim',
    args: {
      reasonId: await claimReasonId(context),
      description: 'Falla persistente',
    },
    reportedAt: openedAt,
  })
}

async function expectClaimTimes(ticketId: string, resolvedAt: string) {
  const resolved = await context.db.execute(sql`
    select status, resolved_at from public.ticket_claims
    where ticket_id = ${ticketId}
    order by opened_at desc
    limit 1
  `)
  expect(resolved.rows[0]).toMatchObject({ status: 'resolved' })
  expect(
    timestamp((resolved.rows[0] as { resolved_at: Date | string }).resolved_at),
  ).toBe(resolvedAt)

  const reopened = await context.db.execute(sql`
    select started_at from public.ticket_participants
    where ticket_id = ${ticketId} and ended_at is null
  `)
  expect(reopened.rows).toHaveLength(1)
  expect(
    timestamp((reopened.rows[0] as { started_at: Date | string }).started_at),
  ).toBe(resolvedAt)
}

it('registra la reclamación y su resolución con la hora de su evento', async () => {
  const ticketId = await offlineAttendedTicket(context, refs)
  const openedAt = atMinutesAgo(60)
  const resolvedAt = atMinutesAgo(50)
  await openOfflineClaim(ticketId, openedAt)

  const opened = await context.db.execute(sql`
    select opened_at from public.ticket_claims
    where ticket_id = ${ticketId}
    order by opened_at desc
    limit 1
  `)
  expect(
    timestamp((opened.rows[0] as { opened_at: Date | string }).opened_at),
  ).toBe(openedAt)

  const closedParticipants = await context.db.execute(sql`
    select ended_at from public.ticket_participants
    where ticket_id = ${ticketId} and ended_at is not null
  `)
  for (const row of closedParticipants.rows as Array<{
    ended_at: Date | string
  }>) {
    expect(timestamp(row.ended_at)).toBe(openedAt)
  }

  await offline(context, {
    cookie: context.cookies.supervisor,
    ticketId,
    type: 'resolve_claim',
    args: { resolution: 'upheld' },
    reportedAt: resolvedAt,
  })
  await expectClaimTimes(ticketId, resolvedAt)
})
