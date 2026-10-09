import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Profile, Role, UserRole } from '../domain/access'
import { adminMessages } from '../i18n'

function RoleChips({ roles }: { roles: Role[] }) {
  if (roles.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role.id} variant="secondary">
          {role.label}
        </Badge>
      ))}
    </div>
  )
}

interface UsersTableProps {
  profiles: Profile[]
  roles: Role[]
  assignments: UserRole[]
  onToggleActive: (profile: Profile) => void
  onEditRoles: (profile: Profile) => void
}

function assignedRoles(
  roles: Role[],
  assignments: UserRole[],
  userId: string,
): Role[] {
  return roles.filter((role) =>
    assignments.some(
      (item) => item.userId === userId && item.roleId === role.id,
    ),
  )
}

/** Tabla de usuarios: estado y roles, con acción para editar roles. */
export function UsersTable({
  profiles,
  roles,
  assignments,
  onToggleActive,
  onEditRoles,
}: UsersTableProps) {
  const { users } = adminMessages

  const columns: DataTableColumn<Profile>[] = [
    {
      id: 'name',
      header: adminMessages.fields.full_name,
      cell: (profile) => (
        <span className="font-medium">{profile.fullName}</span>
      ),
    },
    {
      id: 'active',
      header: users.active,
      cell: (profile) => (
        <Switch
          checked={profile.active}
          aria-label={`${users.active}: ${profile.fullName}`}
          onCheckedChange={() => onToggleActive(profile)}
        />
      ),
    },
    {
      id: 'roles',
      header: users.roles,
      cell: (profile) => (
        <RoleChips roles={assignedRoles(roles, assignments, profile.id)} />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (profile) => (
        <Button
          type="button"
          variant="outline"
          className="min-h-9"
          onClick={() => onEditRoles(profile)}
        >
          {users.roles}
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={profiles}
      getRowId={(profile) => profile.id}
    />
  )
}
