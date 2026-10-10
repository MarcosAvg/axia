import { UsersIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn, SortState } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import type { Profile, Role, UserRole } from '../domain/access'
import { roleLabelsOf } from '../domain/user-list'
import { adminMessages } from '../i18n'
import { RowActions } from './row-actions'
import { StatusSwitch } from './status-switch'

interface UsersTableProps {
  profiles: Profile[]
  roles: Role[]
  assignments: UserRole[]
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

function buildColumns(
  roles: Role[],
  assignments: UserRole[],
  onToggleActive: (profile: Profile) => void,
  onEditRoles: (profile: Profile) => void,
): DataTableColumn<Profile>[] {
  const { users, list, fields } = adminMessages
  return [
    {
      id: 'full_name',
      header: fields.full_name,
      sortable: true,
      cell: (profile) => (
        <span className="font-medium">{profile.fullName}</span>
      ),
    },
    {
      id: 'roles',
      header: users.roles,
      cell: (profile) => (
        <RoleChips labels={roleLabelsOf(roles, assignments, profile.id)} />
      ),
    },
    {
      id: 'active',
      header: list.active,
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
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-14',
      cell: (profile) => (
        <div className="flex justify-end">
          <RowActions
            active={profile.active}
            name={profile.fullName}
            editLabel={users.editRoles}
            onEdit={() => onEditRoles(profile)}
            onToggle={() => onToggleActive(profile)}
          />
        </div>
      ),
    },
  ]
}

/** Tabla de usuarios: nombre, roles, estado y acciones. */
export function UsersTable({
  profiles,
  roles,
  assignments,
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

  return (
    <DataTable
      columns={buildColumns(roles, assignments, onToggleActive, onEditRoles)}
      rows={profiles}
      sort={sort}
      onSortChange={onSortChange}
      getRowId={(profile) => profile.id}
    />
  )
}
