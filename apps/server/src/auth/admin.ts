import type { Database } from '../db/client.js'
import {
  createUser,
  listRoles,
  listUsers,
  resetPassword,
  revokeSessionsForUser,
  updateUser,
} from './admin-users.js'

export function createAdminService(db: Database) {
  return {
    listUsers: (query: Parameters<typeof listUsers>[1]) => listUsers(db, query),
    listRoles: () => listRoles(db),
    createUser: (input: Parameters<typeof createUser>[1]) =>
      createUser(db, input),
    updateUser: (
      actor: Parameters<typeof updateUser>[1],
      targetId: string,
      input: Parameters<typeof updateUser>[3],
    ) => updateUser(db, actor, targetId, input),
    resetPassword: (
      actor: Parameters<typeof resetPassword>[1],
      targetId: string,
    ) => resetPassword(db, actor, targetId),
    revokeSessionsForUser: (targetId: string) =>
      revokeSessionsForUser(db, targetId),
  }
}
