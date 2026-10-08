import { Button } from '@/components/ui/button'
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
  const { actions } = adminMessages

  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{profile.fullName}</span>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onToggleActive}
        >
          {profile.active ? actions.deactivate : actions.activate}
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {roles.map((role) => {
          const checked = assignments.some(
            (item) => item.userId === profile.id && item.roleId === role.id,
          )
          return (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={checked}
                onChange={(event) =>
                  event.target.checked ? onAssign(role.id) : onRemove(role.id)
                }
              />
              {role.label}
            </label>
          )
        })}
      </div>
    </li>
  )
}
