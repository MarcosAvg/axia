import { UsersIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn, SortState } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import type { LinkablePerson, Profile, Role, UserRole } from '../domain/access'
import { linkedPersonName, roleLabelsOf } from '../domain/user-list'
import { adminMessages } from '../i18n'
import { RoleChips, UsersCards } from './user-cards'
import { RowActions } from './row-actions'
import { StatusSwitch } from './status-switch'

interface UsersTableProps {
  profiles: Profile[]
  roles: Role[]
  assignments: UserRole[]
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
  sort: SortState | null
  onSortChange: (key: string) => void
  onToggleActive: (profile: Profile) => void
  onEditRoles?: (profile: Profile) => void
  onResetPassword: (profile: Profile) => void
  onRevokeSessions: (profile: Profile) => void
  onDelete: (profile: Profile) => void
}

function nameColumn(): DataTableColumn<Profile> {
  return {
    id: 'fullName',
    header: adminMessages.fields.full_name,
    sortable: true,
    cell: (profile) => (
      <span className="flex flex-col">
        <span className="flex flex-wrap items-center gap-1 font-medium">
          {profile.fullName}
          {profile.mustChangePassword ? (
            <Badge variant="outline">
              {adminMessages.users.mustChangePassword}
            </Badge>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          @{profile.username ?? '—'}
        </span>
      </span>
    ),
  }
}

function lastAccessColumn(): DataTableColumn<Profile> {
  return {
    id: 'lastLoginAt',
    header: adminMessages.users.lastAccess,
    sortable: true,
    cell: (profile) =>
      profile.lastLoginAt ? (
        formatDateTime(profile.lastLoginAt)
      ) : (
        <span className="text-muted-foreground">
          {adminMessages.users.never}
        </span>
      ),
  }
}

function rolesColumn(
  roles: Role[],
  assignments: UserRole[],
): DataTableColumn<Profile> {
  return {
    id: 'roles',
    header: adminMessages.users.roles,
    cell: (profile) => (
      <RoleChips labels={roleLabelsOf(roles, assignments, profile.id)} />
    ),
  }
}

function linkColumn(
  requesters: LinkablePerson[],
  technicians: LinkablePerson[],
): DataTableColumn<Profile> {
  return {
    id: 'link',
    header: adminMessages.users.link,
    cell: (profile) => {
      const names = [
        linkedPersonName(requesters, profile.id),
        linkedPersonName(technicians, profile.id),
      ].filter((name): name is string => Boolean(name))
      return names.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="text-muted-foreground">{names.join(' · ')}</span>
      )
    },
  }
}

function activeColumn(
  onToggleActive: (profile: Profile) => void,
): DataTableColumn<Profile> {
  return {
    id: 'active',
    header: adminMessages.list.active,
    align: 'center',
    className: 'w-24',
    sortable: true,
    cell: (profile) => (
      <div className="flex justify-center">
        <StatusSwitch
          active={profile.active}
          name={profile.fullName}
          onToggle={() => onToggleActive(profile)}
        />
      </div>
    ),
  }
}

interface ActionsColumnOptions {
  onEditRoles?: (profile: Profile) => void
  onToggleActive: (profile: Profile) => void
  onResetPassword: (profile: Profile) => void
  onRevokeSessions: (profile: Profile) => void
  onDelete: (profile: Profile) => void
}

function actionsColumn({
  onEditRoles,
  onToggleActive,
  onResetPassword,
  onRevokeSessions,
  onDelete,
}: ActionsColumnOptions): DataTableColumn<Profile> {
  return {
    id: 'actions',
    header: '',
    align: 'right',
    className: 'w-14',
    cell: (profile) => (
      <div className="flex justify-end">
        <RowActions
          active={profile.active}
          name={profile.fullName}
          editLabel={adminMessages.users.editRoles}
          onEdit={onEditRoles ? () => onEditRoles(profile) : undefined}
          onToggle={() => onToggleActive(profile)}
          onResetPassword={() => onResetPassword(profile)}
          onRevokeSessions={() => onRevokeSessions(profile)}
          onDelete={() => onDelete(profile)}
        />
      </div>
    ),
  }
}

function EmptyUsers() {
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState icon={UsersIcon} title={adminMessages.list.empty} />
    </div>
  )
}

type ColumnsInput = Pick<
  UsersTableProps,
  | 'roles'
  | 'assignments'
  | 'requesters'
  | 'technicians'
  | 'onToggleActive'
  | 'onEditRoles'
  | 'onResetPassword'
  | 'onRevokeSessions'
  | 'onDelete'
>

function columnsFor({
  roles,
  assignments,
  requesters,
  technicians,
  onToggleActive,
  onEditRoles,
  onResetPassword,
  onRevokeSessions,
  onDelete,
}: ColumnsInput): DataTableColumn<Profile>[] {
  return [
    nameColumn(),
    lastAccessColumn(),
    rolesColumn(roles, assignments),
    linkColumn(requesters, technicians),
    activeColumn(onToggleActive),
    actionsColumn({
      onEditRoles,
      onToggleActive,
      onResetPassword,
      onRevokeSessions,
      onDelete,
    }),
  ]
}

/** Tabla de usuarios: nombre, contacto, roles, vínculo, estado y acciones. */
export function UsersTable({
  profiles,
  roles,
  assignments,
  requesters,
  technicians,
  sort,
  onSortChange,
  onToggleActive,
  onEditRoles,
  onResetPassword,
  onRevokeSessions,
  onDelete,
}: UsersTableProps) {
  if (profiles.length === 0) return <EmptyUsers />

  const columns = columnsFor({
    roles,
    assignments,
    requesters,
    technicians,
    onToggleActive,
    onEditRoles,
    onResetPassword,
    onRevokeSessions,
    onDelete,
  })

  return (
    <>
      <UsersCards
        profiles={profiles}
        roles={roles}
        assignments={assignments}
        requesters={requesters}
        technicians={technicians}
        onToggleActive={onToggleActive}
        onEditRoles={onEditRoles}
        onResetPassword={onResetPassword}
        onRevokeSessions={onRevokeSessions}
        onDelete={onDelete}
      />
      <div className="hidden lg:block">
        <DataTable
          columns={columns}
          rows={profiles}
          sort={sort}
          onSortChange={onSortChange}
          getRowId={(profile) => profile.id}
        />
      </div>
    </>
  )
}
