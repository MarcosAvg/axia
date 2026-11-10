import { sql } from 'drizzle-orm'

import type { DbExecutor } from './db.js'
import { writeEvent } from './events.js'
import { actionTimestamp } from './flow-state.js'

export type RouteInput = {
  tx: DbExecutor
  ticketId: string
  cycle: number
  teamId: string
  buildingId: string
  actorId?: string | null
}

/**
 * Ofrece el tiquet a los supervisores candidatos en una ronda nueva. Devuelve
 * cuántas ofertas creó; si no hay candidatos, deja el evento `unrouted` para
 * que administración lo vea y reciba la notificación (RN-03).
 */
export async function routeTicket({
  tx,
  ticketId,
  cycle,
  teamId,
  buildingId,
  actorId = null,
}: RouteInput): Promise<number> {
  const inserted = await tx.execute(sql`
    with next_round as (
      select coalesce(max(offer_round), 0) + 1 as value
      from public.ticket_offers
      where ticket_id = ${ticketId} and cycle = ${cycle}
    )
    insert into public.ticket_offers (
      ticket_id, cycle, offer_round, supervisor_user_id, offered_at
    )
    select ${ticketId}, ${cycle}, next_round.value, ss.user_id,
      ${actionTimestamp()}
    from public.supervisor_scopes ss
    join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
    join public.users u on u.id = ss.user_id and u.active
    cross join next_round
    where ss.team_id = ${teamId}
      and ssb.building_id = ${buildingId}
      and ss.active
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id and r.active
        join public.role_permissions rp on rp.role_id = r.id
        where ur.user_id = ss.user_id and rp.permission_id = 'ticket.view'
      )
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id and r.active
        join public.role_permissions rp on rp.role_id = r.id
        where ur.user_id = ss.user_id and rp.permission_id = 'ticket.take_offer'
      )
    on conflict do nothing
    returning id
  `)
  const offered = inserted.rows.length
  if (offered === 0) {
    await writeEvent(tx, {
      ticketId,
      type: 'unrouted',
      actorId,
      payload: { teamId, buildingId },
    })
    return 0
  }
  await writeEvent(tx, {
    ticketId,
    type: 'offered',
    actorId,
  })
  return offered
}
