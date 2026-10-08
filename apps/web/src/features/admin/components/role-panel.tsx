import type { Permission, Role, RolePermission, Scope } from '../domain/access'
import { adminMessages } from '../i18n'
import { RoleEditForm } from './role-edit-form'
import { RolePermissions } from './role-permissions'

interface RolePanelProps {
  role: Role
  permissions: Permission[]
  assignments: RolePermission[]
  isSaving: boolean
  onSave: (values: { label: string; active: boolean }) => void
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}

/** Edición del rol elegido y su matriz de permisos. */
export function RolePanel({
  role,
  permissions,
  assignments,
  isSaving,
  onSave,
  onSet,
  onRemove,
}: RolePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <RoleEditForm
        key={role.id}
        role={role}
        isSaving={isSaving}
        onSave={onSave}
      />
      <h3 className="text-sm font-medium">{adminMessages.roles.permissions}</h3>
      <RolePermissions
        roleId={role.id}
        permissions={permissions}
        assignments={assignments}
        onSet={onSet}
        onRemove={onRemove}
      />
    </div>
  )
}
