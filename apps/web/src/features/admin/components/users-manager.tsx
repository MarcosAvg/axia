import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
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
import { UserRow } from './user-row'

/** Usuarios: roles, activar/desactivar y vínculos con los catálogos. */
export function UsersManager() {
  const profiles = useProfiles()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const assign = useAssignUserRole()
  const remove = useRemoveUserRole()
  const setActive = useSetProfileActive()
  const { users, list } = adminMessages

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-medium">{users.title}</h2>
      {profiles.isLoading ? <LoadingList rows={4} /> : null}
      {profiles.isError ? <ErrorAlert message={list.error} /> : null}
      {profiles.data ? (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {profiles.data.map((profile) => (
            <UserRow
              key={profile.id}
              profile={profile}
              roles={roles.data ?? []}
              assignments={userRoles.data ?? []}
              onToggleActive={() =>
                setActive.mutate({ id: profile.id, active: !profile.active })
              }
              onAssign={(roleId) =>
                assign.mutate({ userId: profile.id, roleId })
              }
              onRemove={(roleId) =>
                remove.mutate({ userId: profile.id, roleId })
              }
            />
          ))}
        </ul>
      ) : null}
      <LinksManager />
    </div>
  )
}
