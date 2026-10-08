import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const selectClass =
  'min-h-9 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30'

/** Matriz de permisos con el ámbito asignado al rol elegido. */
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{roles.permissions}</TableHead>
          <TableHead>{roles.scope}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.map((permission) => (
          <TableRow key={permission.id}>
            <TableCell>{permission.description}</TableCell>
            <TableCell>
              <select
                aria-label={`${roles.scope}: ${permission.description}`}
                className={selectClass}
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
