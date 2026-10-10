import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nextSort, sortRows } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { LinkablePerson, Profile } from '../domain/access'
import { filterProfiles } from '../domain/user-list'
import {
  useAssignUserRole,
  usePeople,
  useProfiles,
  useRemoveUserRole,
  useRoles,
  useSetProfileActive,
  useUserRoles,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { UserLinks } from './user-links'
import { UserRolesDialog } from './user-roles-dialog'
import { UsersTable } from './users-table'

const EMPTY_PEOPLE: {
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
} = { requesters: [], technicians: [] }

function AccountsPanel() {
  const profiles = useProfiles()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const people = usePeople()
  const assign = useAssignUserRole()
  const remove = useRemoveUserRole()
  const setActive = useSetProfileActive()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const { users, list } = adminMessages

  const roleList = roles.data ?? []
  const assignmentList = userRoles.data ?? []
  const peopleData = people.data ?? EMPTY_PEOPLE
  const visible = sortRows(
    filterProfiles(profiles.data ?? [], roleList, assignmentList, query),
    sort,
  )

  return (
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
          requesters={peopleData.requesters}
          technicians={peopleData.technicians}
          sort={sort}
          onSortChange={(key) => setSort((current) => nextSort(current, key))}
          onToggleActive={(profile) =>
            setActive.mutate({ id: profile.id, active: !profile.active })
          }
          onEditRoles={setEditing}
        />
      ) : null}
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
    </div>
  )
}

/** Usuarios: cuentas (roles y estado) y vínculos con los catálogos, en pestañas. */
export function UsersManager() {
  const { users } = adminMessages
  return (
    <Tabs defaultValue="accounts" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="accounts" className="min-h-9">
          {users.accountsTab}
        </TabsTrigger>
        <TabsTrigger value="links" className="min-h-9">
          {users.linksTab}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="accounts">
        <AccountsPanel />
      </TabsContent>
      <TabsContent value="links">
        <UserLinks />
      </TabsContent>
    </Tabs>
  )
}
