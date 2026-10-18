import { Button } from '@/components/ui/button'
import { UsersIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn, SortState } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import type { LinkablePerson, Profile, Role, UserRole } from '../domain/access'
import { linkedPersonName, roleLabelsOf } from '../domain/user-list'
import { adminMessages } from '../i18n'
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
  onEditRoles: (profile: Profile) => void
}

function RoleChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge key={label} variant="secondary">
          {label}
        </Badge>
      ))}
    </div>
  )
}

function linksText(
  profile: Profile,
  requesters: LinkablePerson[],
  technicians: LinkablePerson[],
): string | null {
  const names = [
    linkedPersonName(requesters, profile.id),
    linkedPersonName(technicians, profile.id),
  ].filter((name): name is string => Boolean(name))
  return names.length > 0 ? names.join(' · ') : null
}

function UsersCards({
  profiles,
  roles,
  assignments,
  requesters,
  technicians,
  onToggleActive,
  onEditRoles,
}: Omit<UsersTableProps, 'sort' | 'onSortChange'>) {
  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {profiles.map((profile) => {
        const labels = roleLabelsOf(roles, assignments, profile.id)
        const links = linksText(profile, requesters, technicians)
        return (
          <li
            key={profile.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{profile.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.phone ?? '—'}
                </p>
              </div>
              <StatusSwitch
                active={profile.active}
                name={profile.fullName}
                onToggle={() => onToggleActive(profile)}
              />
            </div>
            <RoleChips labels={labels} />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {links ?? '—'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditRoles(profile)}
              >
                {adminMessages.users.editRoles}
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function nameColumn(): DataTableColumn<Profile> {
  return {
    id: 'full_name',
    header: adminMessages.fields.full_name,
    sortable: true,
    cell: (profile) => <span className="font-medium">{profile.fullName}</span>,
  }
}

function phoneColumn(): DataTableColumn<Profile> {
  return {
    id: 'phone',
    header: adminMessages.users.phone,
    cell: (profile) =>
      profile.phone ?? <span className="text-muted-foreground">—</span>,
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

function actionsColumn(
  onEditRoles: (profile: Profile) => void,
  onToggleActive: (profile: Profile) => void,
): DataTableColumn<Profile> {
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
          onEdit={() => onEditRoles(profile)}
          onToggle={() => onToggleActive(profile)}
        />
      </div>
    ),
  }
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
}: UsersTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState icon={UsersIcon} title={adminMessages.list.empty} />
      </div>
    )
  }

  const columns: DataTableColumn<Profile>[] = [
    nameColumn(),
    phoneColumn(),
    rolesColumn(roles, assignments),
    linkColumn(requesters, technicians),
    activeColumn(onToggleActive),
    actionsColumn(onEditRoles, onToggleActive),
  ]

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
