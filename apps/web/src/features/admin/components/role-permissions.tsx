import { useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { fieldSelectClass } from '@/components/shared/form-fields'
import {
  SCOPES,
  filterPermissionGroups,
  groupPermissions,
} from '../domain/access'
import type {
  Permission,
  PermissionGroup,
  RolePermission,
  Scope,
} from '../domain/access'
import { adminMessages } from '../i18n'

interface RolePermissionsProps {
  permissions: Permission[]
  assignments: RolePermission[]
  roleId: string
  readOnly?: boolean
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}

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
  readOnly,
  onSet,
  onRemove,
}: {
  permission: Permission
  scope: Scope | null
  readOnly: boolean
  onSet: (scope: Scope) => void
  onRemove: () => void
}) {
  const { roles, scopeLabels } = adminMessages
  return (
    <div className="flex flex-col gap-2 border-b py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm">{permission.description}</span>
      {readOnly ? (
        <Badge variant="outline" className="w-fit sm:w-56 sm:justify-center">
          {scope ? scopeLabels[scope] : roles.none}
        </Badge>
      ) : (
        <select
          aria-label={`${roles.scope}: ${permission.description}`}
          className={`${fieldSelectClass} sm:w-56`}
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
      )}
    </div>
  )
}

function PermissionGroupSection({
  group,
  assignments,
  roleId,
  readOnly,
  onSet,
  onRemove,
}: {
  group: PermissionGroup
  assignments: RolePermission[]
  roleId: string
  readOnly: boolean
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}) {
  const { permissionGroups } = adminMessages
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">
        {permissionGroups[group.key] ?? group.key}
      </legend>
      <div className="rounded-xl border px-3">
        {group.permissions.map((permission) => (
          <PermissionRow
            key={permission.id}
            permission={permission}
            scope={scopeOf(assignments, roleId, permission.id)}
            readOnly={readOnly}
            onSet={(scope) => onSet(permission.id, scope)}
            onRemove={() => onRemove(permission.id)}
          />
        ))}
      </div>
    </fieldset>
  )
}

/** Matriz de permisos agrupada por área, con el ámbito asignado al rol. */
export function RolePermissions({
  permissions,
  assignments,
  roleId,
  readOnly = false,
  onSet,
  onRemove,
}: RolePermissionsProps) {
  const [query, setQuery] = useState('')
  const groups = filterPermissionGroups(groupPermissions(permissions), query)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="relative max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={adminMessages.roles.searchPermissions}
            aria-label={adminMessages.roles.searchPermissions}
            className="min-h-11 pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {readOnly
            ? adminMessages.roles.adminProtected
            : adminMessages.roles.autoSave}
        </p>
      </div>
      {groups.map((group) => (
        <PermissionGroupSection
          key={group.key}
          group={group}
          assignments={assignments}
          roleId={roleId}
          readOnly={readOnly}
          onSet={onSet}
          onRemove={onRemove}
        />
      ))}
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {adminMessages.roles.noMatches}
        </p>
      ) : null}
    </div>
  )
}
