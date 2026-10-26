import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'

type SupervisorScope = {
  teamId: string
  buildingIds: string[]
}

export type Actor = {
  id: string
  username: string
  fullName: string
  phone: string | null
  active: boolean
  timezone: string
  mustChangePassword: boolean
  roles: Array<{ id: string; name: string; label: string }>
  permissions: Array<{ id: string; scope: string }>
  requesterId: string | null
  requesterUserId: string | null
  technicianId: string | null
  technicianTeamId: string | null
  teamIds: string[]
  supervisorScopes: SupervisorScope[]
}

type UserRow = {
  id: string
  username: string
  full_name: string
  phone: string | null
  active: boolean
  must_change_password: boolean
}

type RoleRow = { id: string; name: string; label: string }
type PermissionRow = { id: string; scope: string }
type TechnicianRow = { id: string; team_id: string }
type ScopeRow = { team_id: string; building_id: string | null }

type ActorRow = UserRow & {
  roles: RoleRow[]
  permissions: PermissionRow[]
  requester_id: string | null
  technician: TechnicianRow | null
  scopes: ScopeRow[]
  timezone: string | null
}

function groupSupervisorScopes(rows: ScopeRow[]): SupervisorScope[] {
  const scopeMap = new Map<string, Set<string>>()
  for (const row of rows) {
    const buildings = scopeMap.get(row.team_id) ?? new Set<string>()
    if (row.building_id) buildings.add(row.building_id)
    scopeMap.set(row.team_id, buildings)
  }
  return [...scopeMap.entries()].map(([teamId, buildings]) => ({
    teamId,
    buildingIds: [...buildings],
  }))
}

async function loadActorRow(
  db: Database,
  userId: string,
): Promise<ActorRow | null> {
  const result = await db.execute(sql`
    select
      u.id,
      u.username,
      u.full_name,
      u.phone,
      u.active,
      u.must_change_password,
      coalesce((
        select json_agg(
          json_build_object('id', r.id, 'name', r.name, 'label', r.label)
          order by r.name
        )
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = u.id and r.active
      ), '[]'::json) as roles,
      coalesce((
        select json_agg(p order by p.id)
        from (
          select distinct rp.permission_id as id, rp.scope
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id and r.active
          join public.role_permissions rp on rp.role_id = r.id
          where ur.user_id = u.id
        ) p
      ), '[]'::json) as permissions,
      (
        select rq.id from public.requesters rq
        where rq.user_id = u.id
        limit 1
      ) as requester_id,
      (
        select json_build_object('id', te.id, 'team_id', te.team_id)
        from public.technicians te
        where te.user_id = u.id
        limit 1
      ) as technician,
      coalesce((
        select json_agg(
          json_build_object('team_id', ss.team_id, 'building_id', ssb.building_id)
        )
        from public.supervisor_scopes ss
        left join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
        where ss.user_id = u.id and ss.active
      ), '[]'::json) as scopes,
      (select s.timezone from public.instance_settings s limit 1) as timezone
    from public.users u
    where u.id = ${userId}
    limit 1
  `)
  return (result.rows[0] as ActorRow | undefined) ?? null
}

function toActor(row: ActorRow): Actor {
  const technician = row.technician
  const supervisorScopes = groupSupervisorScopes(row.scopes)
  const teamIds = new Set(supervisorScopes.map((scope) => scope.teamId))
  if (technician) teamIds.add(technician.team_id)

  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    phone: row.phone,
    active: row.active,
    timezone: row.timezone || 'America/Mexico_City',
    mustChangePassword: row.must_change_password,
    roles: row.roles,
    permissions: row.permissions,
    requesterId: row.requester_id,
    requesterUserId: row.requester_id ? row.id : null,
    technicianId: technician ? technician.id : null,
    technicianTeamId: technician ? technician.team_id : null,
    teamIds: [...teamIds],
    supervisorScopes,
  }
}

export async function loadActor(
  db: Database,
  userId: string,
): Promise<Actor | null> {
  const row = await loadActorRow(db, userId)
  if (!row || !row.active) return null
  return toActor(row)
}

export function can(actor: Actor, permission: string): boolean {
  return actor.permissions.some((grant) => grant.id === permission)
}

declare module 'fastify' {
  interface FastifyRequest {
    actor?: Actor
    sessionId?: string
    sessionClosesAt?: string
  }
}
