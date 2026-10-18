import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Profile, Role, UserRole } from '../domain/access'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'

interface UserRolesDialogProps {
  profile: Profile
  roles: Role[]
  assignments: UserRole[]
  onAssign: (roleId: string) => void
  onRemove: (roleId: string) => void
  onClose: () => void
}

/** Modal para asignar o quitar los roles de un usuario. */
export function UserRolesDialog({
  profile,
  roles,
  assignments,
  onAssign,
  onRemove,
  onClose,
}: UserRolesDialogProps) {
  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={profile.fullName}
      description={`${adminMessages.users.rolesHelp} ${adminMessages.users.rolesAutoSave}`}
    >
      <div className="flex flex-col gap-3 pb-2">
        {roles.map((role) => {
          const id = `user-role-${profile.id}-${role.id}`
          const checked = assignments.some(
            (item) => item.userId === profile.id && item.roleId === role.id,
          )
          return (
            <div
              key={role.id}
              className="flex min-h-11 items-center gap-2 rounded-lg border px-3"
            >
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
      <footer className="flex justify-end border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {adminMessages.actions.close}
        </Button>
      </footer>
    </EntityDialog>
  )
}
