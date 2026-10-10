import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { FormSection } from '@/components/shared/form-section'
import { nextSort, sortRows } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { Profile } from '../domain/access'
import { filterProfiles } from '../domain/user-list'
import {
  useAssignUserRole,
  useProfiles,
  useRemoveUserRole,
  useRoles,
  useSetProfileActive,
  useUserRoles,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
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
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const { users, list } = adminMessages

  const roleList = roles.data ?? []
  const assignmentList = userRoles.data ?? []
  const visible = sortRows(
    filterProfiles(profiles.data ?? [], roleList, assignmentList, query),
    sort,
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <AdminToolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={users.search}
          countText={`${visible.length} ${list.results}`}
        />
        {profiles.isLoading ? <LoadingList rows={4} /> : null}
        {profiles.isError ? <ErrorAlert message={list.error} /> : null}
        {profiles.data ? (
          <UsersTable
            profiles={visible}
            roles={roleList}
            assignments={assignmentList}
            sort={sort}
            onSortChange={(key) => setSort((current) => nextSort(current, key))}
            onToggleActive={(profile) =>
              setActive.mutate({ id: profile.id, active: !profile.active })
            }
            onEditRoles={setEditing}
          />
        ) : null}
      </div>
      {editing ? (
        <UserRolesDialog
          profile={editing}
          roles={roleList}
          assignments={assignmentList}
          onAssign={(roleId) => assign.mutate({ userId: editing.id, roleId })}
          onRemove={(roleId) => remove.mutate({ userId: editing.id, roleId })}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <FormSection title={users.links}>
        <LinksManager />
      </FormSection>
    </div>
  )
}
