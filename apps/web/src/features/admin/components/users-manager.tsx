import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import type { Profile } from '../domain/access'
import {
  useAssignUserRole,
  useProfiles,
  useRemoveUserRole,
  useRoles,
  useSetProfileActive,
  useUserRoles,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'
import { LinksManager } from './links-manager'
import { UserRolesDialog } from './user-roles-dialog'
import { UsersTable } from './users-table'

/** Usuarios: roles, activar/desactivar y vínculos con los catálogos. */
export function UsersManager() {
  const profiles = useProfiles()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const assign = useAssignUserRole()
  const remove = useRemoveUserRole()
  const setActive = useSetProfileActive()
  const [editing, setEditing] = useState<Profile | null>(null)

  return (
    <div className="flex flex-col gap-8">
      {profiles.isLoading ? <LoadingList rows={4} /> : null}
      {profiles.isError ? (
        <ErrorAlert message={adminMessages.list.error} />
      ) : null}
      {profiles.data ? (
        <UsersTable
          profiles={profiles.data}
          roles={roles.data ?? []}
          assignments={userRoles.data ?? []}
          onToggleActive={(profile) =>
            setActive.mutate({ id: profile.id, active: !profile.active })
          }
          onEditRoles={setEditing}
        />
      ) : null}
      {editing ? (
        <UserRolesDialog
          profile={editing}
          roles={roles.data ?? []}
          assignments={userRoles.data ?? []}
          onAssign={(roleId) => assign.mutate({ userId: editing.id, roleId })}
          onRemove={(roleId) => remove.mutate({ userId: editing.id, roleId })}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <LinksManager />
    </div>
  )
}
