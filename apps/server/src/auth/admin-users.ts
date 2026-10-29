import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { can, type Actor } from './authorization.js'
import {
  ADMIN_LOCK_KEY,
  assertAnotherAdmin,
  assertRoleChange,
  queryUser,
  toUserView,
  validateRoleIds,
  type AdminTx,
  type CreateUserInput,
  type ListUsersQuery,
  type RoleView,
  type UpdateUserInput,
  type UserRow,
} from './admin-shared.js'
import { generateTemporaryPassword, hashPassword } from './password.js'
import { revokeUserSessions } from './sessions.js'

export async function listUsers(db: Database, query: ListUsersQuery) {
  const conditions: SQL[] = [sql`u.deleted_at is null`]
  if (query.search) {
    const term = `%${query.search}%`
    conditions.push(
      sql`(u.username ilike ${term} or u.full_name ilike ${term})`,
    )
  }
  if (query.active !== undefined) {
    conditions.push(sql`u.active = ${query.active}`)
  }

  const where = sql.join(conditions, sql` and `)
  const offset = (query.page - 1) * query.pageSize
  const result = await db.execute(sql`
    select
      u.id, u.username, u.full_name, u.active, u.must_change_password,
      u.last_login_at,
      coalesce(
        json_agg(json_build_object('id', r.id, 'name', r.name, 'label', r.label))
          filter (where r.id is not null),
        '[]'::json
      ) as roles,
      count(*) over()::int as total
    from public.users u
    left join public.user_roles ur on ur.user_id = u.id
    left join public.roles r on r.id = ur.role_id and r.active
    where ${where}
    group by u.id
    order by u.created_at desc
    limit ${query.pageSize} offset ${offset}
  `)

  const rows = result.rows as Array<UserRow & { total?: number }>
  return {
    items: rows.map(toUserView),
    total: rows[0]?.total ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function listRoles(db: Database): Promise<RoleView[]> {
  const result = await db.execute(sql`
    select id, name, label
    from public.roles
    where active
    order by label
  `)
  return result.rows as RoleView[]
}

function assertCanAssignRoles(
  actor: Actor,
  roleIds: string[] | undefined,
): void {
  if (!roleIds) return
  if (can(actor, 'role.manage')) return
  throw new AppError(403, 'forbidden', 'No tienes permiso para asignar roles')
}

export async function createUser(
  db: Database,
  actor: Actor,
  input: CreateUserInput,
) {
  assertCanAssignRoles(actor, input.roleIds)

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  const createdId = await db.transaction(async (tx) => {
    await validateRoleIds(tx, input.roleIds)
    const result = await tx.execute(sql`
      insert into public.users (
        username, full_name, password_hash, must_change_password, password_changed_at
      )
      values (${input.username}, ${input.fullName}, ${passwordHash}, true, now())
      returning id
    `)
    const row = result.rows[0] as { id: string } | undefined
    if (!row) throw new Error('User could not be created')

    for (const roleId of input.roleIds) {
      await tx.execute(sql`
        insert into public.user_roles (user_id, role_id)
        values (${row.id}, ${roleId})
      `)
    }
    return row.id
  })

  const user = await queryUser(db, createdId)
  if (!user) throw new Error('Created user could not be loaded')
  return { user, temporaryPassword }
}

type TargetUser = {
  id: string
  active: boolean
  deleted_at: Date | string | null
}

export async function loadTarget(
  tx: AdminTx,
  targetId: string,
): Promise<TargetUser> {
  const result = await tx.execute(sql`
    select id, active, deleted_at
    from public.users
    where id = ${targetId}
    for update
  `)
  const target = result.rows[0] as TargetUser | undefined
  if (!target || target.deleted_at) {
    throw new AppError(404, 'not_found', 'Usuario no encontrado')
  }
  return target
}

export async function isAdmin(tx: AdminTx, userId: string): Promise<boolean> {
  const result = await tx.execute(sql`
    select count(*)::int as count
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = ${userId} and r.name = 'administrator'
  `)
  return ((result.rows[0] as { count: number } | undefined)?.count ?? 0) > 0
}

async function applyUserUpdate(
  tx: AdminTx,
  targetId: string,
  input: UpdateUserInput,
) {
  const updates: SQL[] = []
  if (input.fullName !== undefined) {
    updates.push(sql`full_name = ${input.fullName}`)
  }
  if (input.active !== undefined) {
    updates.push(sql`active = ${input.active}`)
  }
  if (updates.length === 0) return
  await tx.execute(sql`
    update public.users set ${sql.join(updates, sql`, `)} where id = ${targetId}
  `)
}

async function replaceRoles(tx: AdminTx, targetId: string, roleIds: string[]) {
  await tx.execute(sql`
    delete from public.user_roles where user_id = ${targetId}
  `)
  for (const roleId of roleIds) {
    await tx.execute(sql`
      insert into public.user_roles (user_id, role_id)
      values (${targetId}, ${roleId})
    `)
  }
}

export async function updateUser(
  db: Database,
  actor: Actor,
  targetId: string,
  input: UpdateUserInput,
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_LOCK_KEY})`)
    const target = await loadTarget(tx, targetId)

    assertCanAssignRoles(actor, input.roleIds)

    if (target.id === actor.id && input.active === false) {
      throw new AppError(
        409,
        'self_protected',
        'No puedes desactivar tu propia cuenta',
      )
    }

    if (input.roleIds) {
      await validateRoleIds(tx, input.roleIds)
      await assertRoleChange(tx, actor, target, input.roleIds)
    }

    if (
      input.active === false &&
      target.active &&
      (await isAdmin(tx, targetId))
    ) {
      await assertAnotherAdmin(tx, targetId)
    }

    await applyUserUpdate(tx, targetId, input)
    if (input.roleIds) await replaceRoles(tx, targetId, input.roleIds)

    if (input.active === false) {
      await tx.execute(sql`
        update public.sessions
        set revoked_at = now()
        where user_id = ${targetId} and revoked_at is null
      `)
    }
  })

  const user = await queryUser(db, targetId)
  if (!user) throw new AppError(404, 'not_found', 'Usuario no encontrado')
  return user
}

export async function resetPassword(
  db: Database,
  actor: Actor,
  targetId: string,
) {
  if (actor.id === targetId) {
    throw new AppError(
      409,
      'self_protected',
      'Usa el cambio de contraseña para tu propia cuenta',
    )
  }

  const targetIsAdmin = await db.execute(sql`
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.id = ${targetId}
      and u.deleted_at is null
      and r.name = 'administrator'
    limit 1
  `)
  if (targetIsAdmin.rows[0] && !can(actor, 'role.manage')) {
    throw new AppError(
      403,
      'forbidden',
      'No tienes permiso para restablecer la contraseña de un administrador',
    )
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)
  const result = await db.execute(sql`
    update public.users
    set password_hash = ${passwordHash},
        must_change_password = true,
        password_changed_at = now()
    where id = ${targetId} and deleted_at is null
    returning id
  `)
  if (result.rowCount !== 1) {
    throw new AppError(404, 'not_found', 'Usuario no encontrado')
  }
  await revokeUserSessions(db, targetId)
  return { temporaryPassword }
}

export async function revokeSessionsForUser(db: Database, targetId: string) {
  const result = await db.execute(sql`
    select 1 from public.users where id = ${targetId} and deleted_at is null
  `)
  if (result.rowCount !== 1) {
    throw new AppError(404, 'not_found', 'Usuario no encontrado')
  }
  await revokeUserSessions(db, targetId)
}
