import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { Actor } from './authorization.js'

export const ADMIN_LOCK_KEY = 1_956_721_334 // "AXIA-ADMIN"

export type RoleView = { id: string; name: string; label: string }

export type UserView = {
  id: string
  username: string
  fullName: string
  active: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  roles: RoleView[]
}

export type UserRow = {
  id: string
  username: string
  full_name: string
  active: boolean
  must_change_password: boolean
  last_login_at: Date | string | null
  roles: RoleView[] | null
}

export type ListUsersQuery = {
  search?: string
  active?: boolean
  page: number
  pageSize: number
}

export type CreateUserInput = {
  username: string
  fullName: string
  roleIds: string[]
}

export type UpdateUserInput = {
  fullName?: string
  active?: boolean
  roleIds?: string[]
}

export type AdminTx = Parameters<Parameters<Database['transaction']>[0]>[0]

export function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    active: row.active,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at
      ? new Date(row.last_login_at).toISOString()
      : null,
    roles: row.roles ?? [],
  }
}

export async function queryUser(
  db: Database,
  id: string,
): Promise<UserView | null> {
  const result = await db.execute(sql`
    select
      u.id, u.username, u.full_name, u.active, u.must_change_password,
      u.last_login_at,
      coalesce(
        json_agg(json_build_object('id', r.id, 'name', r.name, 'label', r.label))
          filter (where r.id is not null),
        '[]'::json
      ) as roles
    from public.users u
    left join public.user_roles ur on ur.user_id = u.id
    left join public.roles r on r.id = ur.role_id and r.active
    where u.id = ${id}
    group by u.id
  `)
  const row = result.rows[0] as UserRow | undefined
  return row ? toUserView(row) : null
}

export async function validateRoleIds(tx: AdminTx, roleIds: string[]) {
  for (const roleId of roleIds) {
    const result = await tx.execute(sql`
      select 1 from public.roles where id = ${roleId} and active
    `)
    if (result.rowCount !== 1) {
      throw new AppError(400, 'invalid_roles', 'Uno de los roles no existe')
    }
  }
}

export async function assertAnotherAdmin(tx: AdminTx, targetId: string) {
  const result = await tx.execute(sql`
    select count(*)::int as count
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where r.name = 'administrator'
      and u.active
      and u.deleted_at is null
      and u.id <> ${targetId}
  `)
  const row = result.rows[0] as { count: number } | undefined
  if (!row || row.count === 0) {
    throw new AppError(
      409,
      'last_admin',
      'No puedes dejar la instancia sin un administrador activo',
    )
  }
}

export async function assertRoleChange(
  tx: AdminTx,
  actor: Actor,
  target: { id: string; active: boolean },
  roleIds: string[],
) {
  const adminResult = await tx.execute(sql`
    select id from public.roles where name = 'administrator' limit 1
  `)
  const adminRole = adminResult.rows[0] as { id: string } | undefined
  if (!adminRole) return

  const targetRoles = await tx.execute(sql`
    select role_id from public.user_roles where user_id = ${target.id}
  `)
  const wasAdmin = targetRoles.rows.some(
    (row) => (row as { role_id: string }).role_id === adminRole.id,
  )
  const willBeAdmin = roleIds.includes(adminRole.id)

  if (target.id === actor.id && wasAdmin && !willBeAdmin) {
    throw new AppError(
      409,
      'self_protected',
      'No puedes quitarte el rol de administrador',
    )
  }

  if (target.active && wasAdmin && !willBeAdmin) {
    await assertAnotherAdmin(tx, target.id)
  }
}
