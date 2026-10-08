import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import type { Profile, Role, UserRole } from '../domain/access'
import { adminMessages } from '../i18n'

interface UserRowProps {
  profile: Profile
  roles: Role[]
  assignments: UserRole[]
  onToggleActive: () => void
  onAssign: (roleId: string) => void
  onRemove: (roleId: string) => void
}

/** Fila de un usuario: activar/desactivar y roles. */
export function UserRow({
  profile,
  roles,
  assignments,
  onToggleActive,
  onAssign,
  onRemove,
}: UserRowProps) {
  const { list } = adminMessages
  const activeId = `user-active-${profile.id}`

  return (
    <li className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{profile.fullName}</span>
        <div className="flex items-center gap-2">
          <Switch
            id={activeId}
            checked={profile.active}
            onCheckedChange={() => onToggleActive()}
          />
          <label htmlFor={activeId} className="text-sm text-muted-foreground">
            {list.active}
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {roles.map((role) => {
          const id = `user-role-${profile.id}-${role.id}`
          const checked = assignments.some(
            (item) => item.userId === profile.id && item.roleId === role.id,
          )
          return (
            <div key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) =>
                  value ? onAssign(role.id) : onRemove(role.id)
                }
              />
              <label htmlFor={id} className="text-sm">
                {role.label}
              </label>
            </div>
          )
        })}
      </div>
    </li>
  )
}
