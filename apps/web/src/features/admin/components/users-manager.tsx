import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sortRows } from '@/lib/sort'
import { useAuth } from '@/features/auth'
import type { Profile } from '../domain/access'
import { filterProfiles } from '../domain/user-list'
import { useAccountsActions, useAccountsData } from '../hooks/use-accounts'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { UserLinks } from './user-links'
import { UserRolesDialog } from './user-roles-dialog'
import { UsersTable } from './users-table'

function UsersConfirmDialog({
  profile,
  isPending,
  onConfirm,
  onClose,
}: {
  profile: Profile | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!profile) return null
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={profile.active ? 'Desactivar cuenta' : 'Activar cuenta'}
      description={
        profile.active
          ? `${profile.fullName} dejará de poder iniciar sesión.`
          : `${profile.fullName} podrá volver a iniciar sesión.`
      }
      confirmLabel={profile.active ? 'Desactivar' : 'Activar'}
      destructive={profile.active}
      isPending={isPending}
      onConfirm={onConfirm}
    />
  )
}

function AccountsRoleDialog({
  profile,
  roles,
  assignments,
  onAssign,
  onRemove,
  onClose,
}: {
  profile: Profile | null
  roles: Parameters<typeof UserRolesDialog>[0]['roles']
  assignments: Parameters<typeof UserRolesDialog>[0]['assignments']
  onAssign: (roleId: string) => void
  onRemove: (roleId: string) => void
  onClose: () => void
}) {
  if (!profile) return null
  return (
    <UserRolesDialog
      profile={profile}
      roles={roles}
      assignments={assignments}
      onAssign={onAssign}
      onRemove={onRemove}
      onClose={onClose}
    />
  )
}

function AccountsToolbar({
  query,
  count,
  onQuery,
}: {
  query: string
  count: number
  onQuery: (value: string) => void
}) {
  const { users, list } = adminMessages
  return (
    <AdminToolbar
      query={query}
      onQueryChange={onQuery}
      searchPlaceholder={users.search}
      countText={`${count} ${list.results}`}
    />
  )
}

function AccountsTable({
  visible,
  data,
  sort,
  onSort,
  onToggle,
  onEdit,
}: {
  visible: Profile[]
  data: ReturnType<typeof useAccountsData>
  sort: Parameters<typeof UsersTable>[0]['sort']
  onSort: Parameters<typeof UsersTable>[0]['onSortChange']
  onToggle: Parameters<typeof UsersTable>[0]['onToggleActive']
  onEdit: Parameters<typeof UsersTable>[0]['onEditRoles']
}) {
  return (
    <UsersTable
      profiles={visible}
      roles={data.roleList}
      assignments={data.assignmentList}
      requesters={data.peopleData.requesters}
      technicians={data.peopleData.technicians}
      sort={sort}
      onSortChange={onSort}
      onToggleActive={onToggle}
      onEditRoles={onEdit}
    />
  )
}

function AccountsPanel() {
  const { identity } = useAuth()
  const data = useAccountsData()
  const actions = useAccountsActions({
    currentUserId: identity?.userId,
    profileList: data.profileList,
    roleList: data.roleList,
    assignmentList: data.assignmentList,
  })
  const editing = actions.editing
  const visible = sortRows(
    filterProfiles(
      data.profileList,
      data.roleList,
      data.assignmentList,
      actions.query,
    ),
    actions.sort,
  )

  return (
    <div className="flex flex-col gap-4">
      <AccountsToolbar
        query={actions.query}
        count={visible.length}
        onQuery={actions.setQuery}
      />
      {data.profiles.isLoading ? <LoadingList rows={4} /> : null}
      {data.profiles.isError ? (
        <ErrorAlert message={adminMessages.list.error} />
      ) : null}
      {data.profiles.data ? (
        <AccountsTable
          visible={visible}
          data={data}
          sort={actions.sort}
          onSort={actions.toggleSort}
          onToggle={actions.requestToggle}
          onEdit={actions.setEditing}
        />
      ) : null}
      <AccountsRoleDialog
        profile={editing}
        roles={data.roleList}
        assignments={data.assignmentList}
        onAssign={(roleId) =>
          editing && actions.assign.mutate({ userId: editing.id, roleId })
        }
        onRemove={actions.removeRole}
        onClose={() => actions.setEditing(null)}
      />
      <UsersConfirmDialog
        profile={actions.confirming}
        isPending={actions.setActive.isPending}
        onConfirm={actions.confirmToggle}
        onClose={() => actions.setConfirming(null)}
      />
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
