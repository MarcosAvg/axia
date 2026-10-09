import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import type { Profile, Role, UserRole } from '../domain/access'

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{profile.fullName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
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
      </DialogContent>
    </Dialog>
  )
}
