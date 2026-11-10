import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { buildTicketFixtures, type TicketFixtures } from './tickets-fixtures.js'

let fixtures: TicketFixtures
let participantId: string
let assignmentId: string
let pauseId: string
let stepId: string

beforeAll(async () => {
  fixtures = await buildTicketFixtures()
  const { db, ids, people, catalog } = fixtures
  const reason = await db.execute(sql`
    select id from public.reasons
    where use = 'pause' and parent_id is null
    limit 1
  `)
  const reasonId = (reason.rows[0] as { id: string }).id
  const participant = await db.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id,
      started_at, ended_at
    ) values (
      ${ids.ticketA1}, 1, ${people.technicianRow.id}, 'auxiliary',
      ${catalog.categoryA.id}, now(), now()
    )
    returning id
  `)
  participantId = (participant.rows[0] as { id: string }).id
  const assignment = await db.execute(sql`
    select id from public.ticket_assignments
    where ticket_id = ${ids.ticketA1} and stage = 'technician'
    limit 1
  `)
  assignmentId = (assignment.rows[0] as { id: string }).id
  const pause = await db.execute(sql`
    insert into public.ticket_pauses (
      ticket_id, cycle, reason_id, root_reason_id, opened_at, closed_at
    ) values (
      ${ids.ticketAux}, 1, ${reasonId}, ${reasonId}, now(), now()
    )
    returning id
  `)
  pauseId = (pause.rows[0] as { id: string }).id
  const step = await db.execute(sql`
    insert into public.ticket_pause_steps (
      pause_id, reason_id, entered_at, exited_at
    ) values (${pauseId}, ${reasonId}, now(), now())
    returning id
  `)
  stepId = (step.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await fixtures.pool.end()
})

it('rechaza una participación que termina antes de empezar', async () => {
  await expect(
    fixtures.db.execute(sql`
      update public.ticket_participants
      set ended_at = started_at - interval '1 hour'
      where id = ${participantId}
    `),
  ).rejects.toThrow()
})

it('rechaza una asignación que termina antes de empezar', async () => {
  await expect(
    fixtures.db.execute(sql`
      update public.ticket_assignments
      set ended_at = assigned_at - interval '1 hour'
      where id = ${assignmentId}
    `),
  ).rejects.toThrow()
})

it('rechaza una pausa cerrada antes de abrirse', async () => {
  await expect(
    fixtures.db.execute(sql`
      update public.ticket_pauses
      set closed_at = opened_at - interval '1 hour'
      where id = ${pauseId}
    `),
  ).rejects.toThrow()
})

it('rechaza un paso de pausa que sale antes de entrar', async () => {
  await expect(
    fixtures.db.execute(sql`
      update public.ticket_pause_steps
      set exited_at = entered_at - interval '1 hour'
      where id = ${stepId}
    `),
  ).rejects.toThrow()
})

it('rechaza un cierre anterior al registro', async () => {
  await expect(
    fixtures.db.execute(sql`
      update public.tickets
      set closed_at = reported_at - interval '1 hour'
      where id = ${fixtures.ids.ticketA1}
    `),
  ).rejects.toThrow()
})
