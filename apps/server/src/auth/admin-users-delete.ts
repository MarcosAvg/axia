import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  ADMIN_LOCK_KEY,
  assertAnotherAdmin,
  type AdminTx,
} from './admin-shared.js'
import { isAdmin, loadTarget } from './admin-users.js'
import { can, type Actor } from './authorization.js'

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  if (code === '23503') return true
  const cause = (error as { cause?: unknown }).cause
  return cause ? isForeignKeyViolation(cause) : false
}

async function softDeleteUser(tx: AdminTx, targetId: string) {
  await tx.execute(sql`
    update public.users
    set
      active = false,
      deleted_at = now(),
      username = ${`deleted-${targetId}`}
    where id = ${targetId}
  `)
  await tx.execute(sql`
    delete from public.user_roles where user_id = ${targetId}
  `)
  await tx.execute(sql`
    delete from public.supervisor_scopes where user_id = ${targetId}
  `)
  await tx.execute(sql`
    delete from public.push_subscriptions where user_id = ${targetId}
  `)
  await tx.execute(sql`
    delete from public.notifications where recipient_user_id = ${targetId}
  `)
  await tx.execute(sql`
    delete from public.sessions where user_id = ${targetId}
  `)
  await tx.execute(sql`
    update public.requesters set user_id = null where user_id = ${targetId}
  `)
  await tx.execute(sql`
    update public.technicians set user_id = null where user_id = ${targetId}
  `)
}

export async function deleteUser(
  db: Database,
  actor: Actor,
  targetId: string,
): Promise<'deleted' | 'archived'> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_LOCK_KEY})`)
    const target = await loadTarget(tx, targetId)

    if (target.id === actor.id) {
      throw new AppError(
        409,
        'self_protected',
        'No puedes eliminar tu propia cuenta',
      )
    }

    const targetIsAdmin = await isAdmin(tx, targetId)
    if (targetIsAdmin && !can(actor, 'role.manage')) {
      throw new AppError(
        403,
        'forbidden',
        'No tienes permiso para eliminar a un administrador',
      )
    }
    if (target.active && targetIsAdmin) {
      await assertAnotherAdmin(tx, targetId)
    }

    // Si la cuenta no tiene historial, se borra la fila. Si alguna FK la
    // referencia, se conserva para no romper la bitácora.
    await tx.execute(sql.raw('savepoint axia_delete_user'))
    try {
      await tx.execute(sql`delete from public.users where id = ${targetId}`)
      return 'deleted'
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error
      await tx.execute(sql.raw('rollback to savepoint axia_delete_user'))
      await softDeleteUser(tx, targetId)
      return 'archived'
    }
  })
}
