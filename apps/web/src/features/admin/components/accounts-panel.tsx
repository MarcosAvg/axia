import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { sortRows } from '@/lib/sort'
import { useAuth } from '@/features/auth'
import type { Profile, Role } from '../domain/access'
import { filterProfiles } from '../domain/user-list'
import {
  useAccountMutations,
  useAccountsActions,
  useAccountsData,
} from '../hooks/use-accounts'
import type { AccountAction } from '../hooks/use-accounts'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { TemporaryPasswordDialog } from './temporary-password-dialog'
import { UserCreateDialog } from './user-create-dialog'
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
  roles: Role[]
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

function AccountActionDialog({
  action,
  isPending,
  onConfirm,
  onClose,
}: {
  action: AccountAction | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!action) return null
  const { users } = adminMessages
  const isReset = action.kind === 'reset'
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={isReset ? users.resetTitle : users.revokeTitle}
      description={
        isReset
          ? users.resetDescription(action.profile.fullName)
          : users.revokeDescription(action.profile.fullName)
      }
      confirmLabel={isReset ? users.resetPassword : users.revokeSessions}
      destructive={isReset}
      isPending={isPending}
      onConfirm={onConfirm}
    />
  )
}

function AccountsToolbar({
  query,
  count,
  onQuery,
  onAdd,
}: {
  query: string
  count: number
  onQuery: (value: string) => void
  onAdd: () => void
}) {
  const { users, list } = adminMessages
  return (
    <AdminToolbar
      query={query}
      onQueryChange={onQuery}
      searchPlaceholder={users.search}
      countText={`${count} ${list.results}`}
      addLabel={users.newUser}
      onAdd={onAdd}
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
  onReset,
  onRevoke,
}: {
  visible: Profile[]
  data: ReturnType<typeof useAccountsData>
  sort: Parameters<typeof UsersTable>[0]['sort']
  onSort: Parameters<typeof UsersTable>[0]['onSortChange']
  onToggle: Parameters<typeof UsersTable>[0]['onToggleActive']
  onEdit: Parameters<typeof UsersTable>[0]['onEditRoles']
  onReset: Parameters<typeof UsersTable>[0]['onResetPassword']
  onRevoke: Parameters<typeof UsersTable>[0]['onRevokeSessions']
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
      onResetPassword={onReset}
      onRevokeSessions={onRevoke}
    />
  )
}

function AccountDialogs({
  mutations,
  roles,
}: {
  mutations: ReturnType<typeof useAccountMutations>
  roles: Role[]
}) {
  return (
    <>
      {mutations.creating ? (
        <UserCreateDialog
          roles={roles}
          isSaving={mutations.create.isPending}
          error={mutations.create.isError ? adminMessages.actions.error : null}
          onCreate={mutations.handleCreate}
          onClose={() => {
            mutations.create.reset()
            mutations.setCreating(false)
          }}
        />
      ) : null}
      <AccountActionDialog
        action={mutations.action}
        isPending={mutations.isActionPending}
        onConfirm={
          mutations.action?.kind === 'reset'
            ? mutations.handleReset
            : mutations.handleRevoke
        }
        onClose={() => mutations.setAction(null)}
      />
      {mutations.password ? (
        <TemporaryPasswordDialog
          open
          mode={mutations.password.mode}
          username={mutations.password.username}
          password={mutations.password.password}
          onClose={() => {
            if (mutations.password?.mode === 'reset') {
              mutations.reset.reset()
            } else {
              mutations.create.reset()
            }
            mutations.setPassword(null)
          }}
        />
      ) : null}
    </>
  )
}

function AccountsContent({
  data,
  actions,
  mutations,
  visible,
}: {
  data: ReturnType<typeof useAccountsData>
  actions: ReturnType<typeof useAccountsActions>
  mutations: ReturnType<typeof useAccountMutations>
  visible: Profile[]
}) {
  if (data.profiles.isLoading || data.accounts.isLoading)
    return <LoadingList rows={4} />
  if (data.profiles.isError || data.accounts.isError)
    return <ErrorAlert message={adminMessages.list.error} />
  return (
    <AccountsTable
      visible={visible}
      data={data}
      sort={actions.sort}
      onSort={actions.toggleSort}
      onToggle={actions.requestToggle}
      onEdit={actions.setEditing}
      onReset={(profile) => mutations.setAction({ kind: 'reset', profile })}
      onRevoke={(profile) => mutations.setAction({ kind: 'revoke', profile })}
    />
  )
}

export function AccountsPanel() {
  const { identity } = useAuth()
  const data = useAccountsData()
  const actions = useAccountsActions({
    currentUserId: identity?.userId,
    profileList: data.profileList,
    roleList: data.roleList,
    assignmentList: data.assignmentList,
  })
  const mutations = useAccountMutations()
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
        onAdd={() => mutations.setCreating(true)}
      />
      <AccountsContent
        data={data}
        actions={actions}
        mutations={mutations}
        visible={visible}
      />
      <AccountsRoleDialog
        profile={actions.editing}
        roles={data.roleList}
        assignments={data.assignmentList}
        onAssign={(roleId) =>
          actions.editing &&
          actions.assign.mutate({ userId: actions.editing.id, roleId })
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
      <AccountDialogs mutations={mutations} roles={data.roleList} />
    </div>
  )
}
