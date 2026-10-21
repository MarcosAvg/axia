import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'

export type Actor = {
  id: string
  username: string
  fullName: string
  mustChangePassword: boolean
  roles: Array<{ id: string; name: string; label: string }>
  permissions: Array<{ id: string; scope: string }>
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
  const roles = roleResult.rows as RoleRow[]

  const permissionResult = await db.execute(sql`
    select distinct rp.permission_id as id, rp.scope
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.active
    join public.role_permissions rp on rp.role_id = r.id
    where ur.user_id = ${userId}
    order by rp.permission_id
  `)
  const permissions = permissionResult.rows as PermissionRow[]

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    mustChangePassword: user.must_change_password,
    roles,
    permissions,
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
