import { sql } from 'drizzle-orm'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

export type DrillIds = {
  pauseReasonId: string
  pauseIntermediateId: string
  pauseFinalId: string
  rejectionReasonId: string
  channelBId: string
}

export type DrillContext = {
  context: TicketHttpContext
  drill: DrillIds
}

async function seedChannel(ctx: TicketHttpContext) {
  const channel = (
    await ctx.db.execute(sql`
    insert into public.channels (name) values ('Canal de prueba')
    returning id
  `)
  ).rows[0] as { id: string }
  await ctx.db.execute(sql`
    update public.tickets set channel_id = ${channel.id}
    where id = ${ctx.ids.ticketA2}
  `)
  return channel.id
}

async function seedTickets(ctx: TicketHttpContext) {
  const { db, ids: ticket, catalog, people } = ctx
  await db.execute(sql`
    update public.priorities set target_minutes = 30
    where id = ${catalog.priority.id}
  `)
  await db.execute(sql`
    update public.tickets
    set status = 'closed',
        subcategory_id = ${catalog.subcategoryA.id},
        problem_id = ${catalog.problemA.id},
        closed_at = reported_at + interval '10 minutes'
    where id = ${ticket.ticketA1}
  `)
  await db.execute(sql`
    update public.tickets
    set status = 'closed',
        subcategory_id = ${catalog.subcategoryB.id},
        problem_id = ${catalog.problemB.id},
        closed_at = reported_at + interval '60 minutes'
    where id = ${ticket.ticketB1}
  `)
  await db.execute(sql`
    update public.tickets
    set status = 'rejected',
        closed_at = reported_at + interval '5 minutes'
    where id = ${ticket.ticketA2}
  `)
  await db.execute(sql`
    insert into public.ticket_ratings (ticket_id, score)
    values (${ticket.ticketA1}, 5), (${ticket.ticketB1}, 3)
  `)
  await db.execute(sql`
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (${ticket.ticketA1}, 1, 'active_work', now() - interval '10 minutes', now())
  `)
  await db.execute(sql`
    insert into public.ticket_captures (ticket_id, cycle, changes)
    values (${ticket.ticketB1}, 1, '{}'::jsonb)
  `)
  await db.execute(sql`
    insert into public.ticket_events (ticket_id, cycle, type, actor_id)
    values (${ticket.ticketAux}, 1, 'reassigned_supervisor', ${people.adminId}),
           (${ticket.ticketB1}, 1, 'reopened', ${people.adminId})
  `)
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, time_confidence
    ) values (${ticket.ticketB1}, 1, 'started', ${people.adminId}, 'unverified')
  `)
  await db.execute(sql`
    insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id, status)
    values (${ticket.ticketA1}, 2, ${people.supervisorUserId}, 'offered')
  `)
}

async function reasonId(
  db: TicketHttpContext['db'],
  use: 'pause' | 'rejection',
  name: string,
  parentId?: string,
): Promise<string> {
  const found = await db.execute(sql`
    select id from public.reasons
    where use = ${use}::public.reason_use
      and name = ${name}
      and parent_id is not distinct from ${parentId ?? null}::uuid
    limit 1
  `)
  const existing = found.rows[0] as { id: string } | undefined
  if (existing) return existing.id
  const inserted = await db.execute(sql`
    insert into public.reasons (use, parent_id, name)
    values (${use}::public.reason_use, ${parentId ?? null}, ${name})
    returning id
  `)
  return (inserted.rows[0] as { id: string }).id
}

async function seedPauses(
  ctx: TicketHttpContext,
): Promise<
  Pick<DrillIds, 'pauseReasonId' | 'pauseIntermediateId' | 'pauseFinalId'>
> {
  const root = await reasonId(ctx.db, 'pause', 'Falta de material')
  const intermediate = await reasonId(ctx.db, 'pause', 'En cotización', root)
  const final = await reasonId(ctx.db, 'pause', 'Compra externa', root)
  const pause = (
    await ctx.db.execute(sql`
    insert into public.ticket_pauses (
      ticket_id, cycle, reason_id, root_reason_id, opened_at, closed_at
    ) values (
      ${ctx.ids.ticketA2}, 1, ${final}, ${root},
      now() - interval '30 minutes', now() - interval '5 minutes'
    )
    returning id
  `)
  ).rows[0] as { id: string }
  await ctx.db.execute(sql`
    insert into public.ticket_pause_steps (pause_id, reason_id, entered_at, exited_at)
    values
      (${pause.id}, ${root}, now() - interval '30 minutes', now() - interval '25 minutes'),
      (${pause.id}, ${intermediate}, now() - interval '25 minutes', now() - interval '15 minutes'),
      (${pause.id}, ${final}, now() - interval '15 minutes', now() - interval '5 minutes')
  `)
  await ctx.db.execute(sql`
    insert into public.ticket_pauses (
      ticket_id, cycle, reason_id, root_reason_id, opened_at, closed_at
    ) values (
      ${ctx.ids.ticketAux}, 1, ${root}, ${root},
      now() - interval '20 minutes', now() - interval '10 minutes'
    )
  `)
  return {
    pauseReasonId: root,
    pauseIntermediateId: intermediate,
    pauseFinalId: final,
  }
}

async function seedTerminal(ctx: TicketHttpContext): Promise<string> {
  const rejectionReasonId = await reasonId(
    ctx.db,
    'rejection',
    'Fuera de alcance',
  )
  await ctx.db.execute(sql`
    insert into public.ticket_events (ticket_id, cycle, type, actor_id, reason_id)
    values
      (${ctx.ids.ticketA2}, 1, 'rejected', ${ctx.people.adminId}, ${rejectionReasonId}),
      (${ctx.ids.ticketA2}, 1, 'rejected', ${ctx.people.adminId}, ${rejectionReasonId})
  `)
  return rejectionReasonId
}

/** Contexto HTTP con tiquets y actividad preparados para probar el desglose. */
export async function buildDrillDownApp(): Promise<DrillContext> {
  const context = await buildTicketHttpApp()
  await seedTickets(context)
  const pauses = await seedPauses(context)
  return {
    context,
    drill: {
      ...pauses,
      rejectionReasonId: await seedTerminal(context),
      channelBId: await seedChannel(context),
    },
  }
}

export async function closeDrillDownApp(context: TicketHttpContext) {
  await closeTicketHttpApp(context)
}
