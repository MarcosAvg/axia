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
  active: boolean
  must_change_password: boolean
}

type RoleRow = { id: string; name: string; label: string }
type PermissionRow = { id: string; scope: string }
type RequesterRow = { id: string; user_id: string }
type TechnicianRow = { id: string; team_id: string }
type ScopeRow = { team_id: string; building_id: string | null }

type ActorContext = Pick<
  Actor,
  | 'requesterId'
  | 'requesterUserId'
  | 'technicianId'
  | 'technicianTeamId'
  | 'teamIds'
  | 'supervisorScopes'
>

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

async function loadRequesterId(
  db: Database,
  userId: string,
): Promise<string | null> {
  const result = await db.execute(sql`
    select id from public.requesters where user_id = ${userId} limit 1
  `)
  return (result.rows[0] as RequesterRow | undefined)?.id ?? null
}

async function loadTechnician(
  db: Database,
  userId: string,
): Promise<TechnicianRow | null> {
  const result = await db.execute(sql`
    select id, team_id from public.technicians where user_id = ${userId} limit 1
  `)
  return (result.rows[0] as TechnicianRow | undefined) ?? null
}

async function loadSupervisorScopes(
  db: Database,
  userId: string,
): Promise<SupervisorScope[]> {
  const result = await db.execute(sql`
    select ss.team_id, ssb.building_id
    from public.supervisor_scopes ss
    left join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
    where ss.user_id = ${userId} and ss.active
  `)
  return groupSupervisorScopes(result.rows as ScopeRow[])
}

async function loadActorContext(
  db: Database,
  userId: string,
): Promise<ActorContext> {
  const requesterId = await loadRequesterId(db, userId)
  const technician = await loadTechnician(db, userId)
  const supervisorScopes = await loadSupervisorScopes(db, userId)
  const teamIds = new Set(supervisorScopes.map((scope) => scope.teamId))
  if (technician?.team_id) teamIds.add(technician.team_id)

  return {
    requesterId,
    requesterUserId: requesterId ? userId : null,
    technicianId: technician?.id ?? null,
    technicianTeamId: technician?.team_id ?? null,
    teamIds: [...teamIds],
    supervisorScopes,
  }
}

export async function loadActor(
  db: Database,
  userId: string,
): Promise<Actor | null> {
  const userResult = await db.execute(sql`
    select id, username, full_name, active, must_change_password
    from public.users
    where id = ${userId}
    limit 1
  `)
  const user = userResult.rows[0] as UserRow | undefined
  if (!user || !user.active) return null

  const roleResult = await db.execute(sql`
    select r.id, r.name, r.label
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = ${userId} and r.active
    order by r.name
  `)

  const permissionResult = await db.execute(sql`
    select distinct rp.permission_id as id, rp.scope
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.active
    join public.role_permissions rp on rp.role_id = r.id
    where ur.user_id = ${userId}
    order by rp.permission_id
  `)

  const context = await loadActorContext(db, userId)

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    mustChangePassword: user.must_change_password,
    roles: roleResult.rows as RoleRow[],
    permissions: permissionResult.rows as PermissionRow[],
    ...context,
  }
}

export function can(actor: Actor, permission: string): boolean {
  return actor.permissions.some((grant) => grant.id === permission)
}

declare module 'fastify' {
  interface FastifyRequest {
    actor?: Actor
    sessionId?: string
  }
}
