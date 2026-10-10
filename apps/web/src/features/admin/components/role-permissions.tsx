import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fieldSelectClass } from '@/components/shared/form-fields'
import { SCOPES, groupPermissions } from '../domain/access'
import type {
  Permission,
  PermissionGroup,
  RolePermission,
  Scope,
} from '../domain/access'
import { adminMessages } from '../i18n'

interface RolePermissionsProps {
  roleId: string
  permissions: Permission[]
  assignments: RolePermission[]
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}

const selectClass = fieldSelectClass

function scopeOf(
  assignments: RolePermission[],
  roleId: string,
  permissionId: string,
): Scope | null {
  const found = assignments.find(
    (item) => item.roleId === roleId && item.permissionId === permissionId,
  )
  return found ? found.scope : null
}

function PermissionRow({
  permission,
  scope,
  onSet,
  onRemove,
}: {
  permission: Permission
  scope: Scope | null
  onSet: (scope: Scope) => void
  onRemove: () => void
}) {
  const { roles, scopeLabels } = adminMessages
  return (
    <TableRow>
      <TableCell>{permission.description}</TableCell>
      <TableCell>
        <select
          aria-label={`${roles.scope}: ${permission.description}`}
          className={selectClass}
          value={scope ?? ''}
          onChange={(event) => {
            const next = SCOPES.find(
              (candidate) => candidate === event.target.value,
            )
            if (next) onSet(next)
            else onRemove()
          }}
        >
          <option value="">{roles.none}</option>
          {SCOPES.map((item) => (
            <option key={item} value={item}>
              {scopeLabels[item]}
            </option>
          ))}
        </select>
      </TableCell>
    </TableRow>
  )
}

function PermissionGroupTable({
  group,
  roleId,
  assignments,
  onSet,
  onRemove,
}: {
  group: PermissionGroup
  roleId: string
  assignments: RolePermission[]
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}) {
  const { roles, permissionGroups } = adminMessages
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">
        {permissionGroups[group.key] ?? group.key}
      </h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{roles.permissions}</TableHead>
            <TableHead>{roles.scope}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.permissions.map((permission) => (
            <PermissionRow
              key={permission.id}
              permission={permission}
              scope={scopeOf(assignments, roleId, permission.id)}
              onSet={(scope) => onSet(permission.id, scope)}
              onRemove={() => onRemove(permission.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Matriz de permisos agrupada por área, con el ámbito asignado al rol. */
export function RolePermissions({
  roleId,
  permissions,
  assignments,
  onSet,
  onRemove,
}: RolePermissionsProps) {
  return (
    <div className="flex flex-col gap-4">
      {groupPermissions(permissions).map((group) => (
        <PermissionGroupTable
          key={group.key}
          group={group}
          roleId={roleId}
          assignments={assignments}
          onSet={onSet}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
