import { FormSection } from '@/components/shared/form-section'
import type { Permission, Role, RolePermission, Scope } from '../domain/access'
import { canEditRolePermissions } from '../domain/access-guards'
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
    <div className="flex min-w-0 flex-col gap-6">
      <FormSection title={adminMessages.roles.title}>
        <RoleEditForm
          key={role.id}
          role={role}
          isSaving={isSaving}
          onSave={onSave}
        />
      </FormSection>
      <FormSection title={adminMessages.roles.permissions}>
        <RolePermissions
          roleId={role.id}
          permissions={permissions}
          assignments={assignments}
          readOnly={!canEditRolePermissions(role)}
          onSet={onSet}
          onRemove={onRemove}
        />
      </FormSection>
    </div>
  )
}
