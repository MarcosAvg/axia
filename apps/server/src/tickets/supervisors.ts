import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { getPermissionScope } from './access.js'

export type SupervisorItem = {
  id: string
  fullName: string
  teamIds: string[]
}

type SupervisorRow = {
  id: string
  full_name: string
  team_ids: string[]
}

export async function listSupervisors(
  db: Database,
  actor: Actor,
): Promise<SupervisorItem[]> {
  const scope = getPermissionScope(actor, 'ticket.assign_supervisor')
  if (!scope) return []

  const teamFilter =
    scope === 'all'
      ? sql`true`
      : actor.teamIds.length === 0
        ? sql`false`
        : sql`ss.team_id in (${sql.join(
            actor.teamIds.map((teamId) => sql`${teamId}::uuid`),
            sql`, `,
          )})`

  const result = await db.execute(sql`
    with visible_scopes as (
      select ss.user_id, ss.team_id
      from public.supervisor_scopes ss
      where ss.active and ${teamFilter}
    )
    select
      u.id,
      u.full_name,
      array_agg(distinct vs.team_id order by vs.team_id) as team_ids
    from public.users u
    join visible_scopes vs on vs.user_id = u.id
    where u.active
    group by u.id, u.full_name
    order by u.full_name, u.id
  `)

  return (result.rows as SupervisorRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    teamIds: row.team_ids,
  }))
}
