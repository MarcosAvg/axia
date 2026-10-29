import type { Database } from '../db/client.js'
import {
  createUser,
  listRoles,
  listUsers,
  resetPassword,
  revokeSessionsForUser,
  updateUser,
} from './admin-users.js'
import { deleteUser } from './admin-users-delete.js'

export function createAdminService(db: Database) {
  return {
    listUsers: (query: Parameters<typeof listUsers>[1]) => listUsers(db, query),
    listRoles: () => listRoles(db),
    createUser: (
      actor: Parameters<typeof createUser>[1],
      input: Parameters<typeof createUser>[2],
    ) => createUser(db, actor, input),
    updateUser: (
      actor: Parameters<typeof updateUser>[1],
      targetId: string,
      input: Parameters<typeof updateUser>[3],
    ) => updateUser(db, actor, targetId, input),
    deleteUser: (actor: Parameters<typeof deleteUser>[1], targetId: string) =>
      deleteUser(db, actor, targetId),
    resetPassword: (
      actor: Parameters<typeof resetPassword>[1],
      targetId: string,
    ) => resetPassword(db, actor, targetId),
    revokeSessionsForUser: (targetId: string) =>
      revokeSessionsForUser(db, targetId),
  }
}
