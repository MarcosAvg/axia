import type { Client } from 'pg'

import type { DemoTicket } from './data.js'

export async function insertDemoOffers(
  client: Client,
  ticketId: string,
  timing: { created: Date; taken: Date; stage: number; supervisorId?: string },
) {
  await client.query(
    `insert into public.ticket_offers (
       ticket_id, cycle, supervisor_user_id, status, offered_at, resolved_at
     ) select t.id, t.cycle, ss.user_id,
         case when $4 = 0 then 'offered'::public.offer_status
           when ss.user_id = $5::uuid then 'taken'::public.offer_status
           else 'withdrawn'::public.offer_status end,
         $2, case when $4 = 0 then null else $3::timestamptz end
       from public.tickets t
       join public.supervisor_scopes ss on ss.team_id = t.team_id and ss.active
       join public.supervisor_scope_buildings sb
         on sb.scope_id = ss.id and sb.building_id = t.building_id
       join public.users u on u.id = ss.user_id and u.active
       where t.id = $1 on conflict do nothing`,
    [
      ticketId,
      timing.created,
      timing.taken,
      timing.stage,
      timing.supervisorId ?? null,
    ],
  )
}

/** Only restores missing routing for untouched demo tickets; never rewrites history. */
export async function repairDemoOffers(client: Client, ticket: DemoTicket) {
  const result = await client.query<{ reported_at: Date }>(
    `select t.reported_at from public.tickets t
     where t.id = $1 and t.status = 'registered' and t.cycle = 1
       and not exists (select 1 from public.ticket_offers o where o.ticket_id = t.id)
       and not exists (select 1 from public.ticket_assignments a where a.ticket_id = t.id)
       and not exists (select 1 from public.ticket_events e where e.ticket_id = t.id
         and e.type not in ('created', 'offered'))
     for update`,
    [ticket.id],
  )
  const row = result.rows[0]
  if (!row) return
  await insertDemoOffers(client, ticket.id, {
    created: row.reported_at,
    taken: row.reported_at,
    stage: 0,
  })
}
