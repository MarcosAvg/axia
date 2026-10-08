import { SCOPES } from '../domain/access'
import type { Permission, RolePermission, Scope } from '../domain/access'
import { adminMessages } from '../i18n'

interface RolePermissionsProps {
  roleId: string
  permissions: Permission[]
  assignments: RolePermission[]
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}

/** Lista de permisos con el ámbito asignado al rol elegido. */
export function RolePermissions({
  roleId,
  permissions,
  assignments,
  onSet,
  onRemove,
}: RolePermissionsProps) {
  const { roles, scopeLabels } = adminMessages

  function scopeOf(permissionId: string): Scope | null {
    const found = assignments.find(
      (item) => item.roleId === roleId && item.permissionId === permissionId,
    )
    return found ? found.scope : null
  }

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {permissions.map((permission) => (
        <li
          key={permission.id}
          className="flex flex-wrap items-center justify-between gap-3 p-3"
        >
          <span className="text-sm">{permission.description}</span>
          <select
            aria-label={`${roles.scope}: ${permission.description}`}
            className="min-h-9 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            value={scopeOf(permission.id) ?? ''}
            onChange={(event) => {
              const scope = SCOPES.find(
                (candidate) => candidate === event.target.value,
              )
              if (scope) {
                onSet(permission.id, scope)
              } else {
                onRemove(permission.id)
              }
            }}
          >
            <option value="">{roles.none}</option>
            {SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scopeLabels[scope]}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  )
}
