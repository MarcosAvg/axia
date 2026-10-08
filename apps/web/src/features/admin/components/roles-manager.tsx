import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { adminMessages } from '../i18n'
import {
  useCreateRole,
  usePermissions,
  useRemoveRolePermission,
  useRolePermissions,
  useRoles,
  useSetRolePermission,
  useUpdateRole,
} from '../hooks/use-access'
import { RoleCreateForm } from './role-create-form'
import { RolePanel } from './role-panel'
import { RoleTabs } from './role-tabs'

/** Roles: alta, edición y matriz de permisos con ámbito. */
export function RolesManager() {
  const roles = useRoles()
  const permissions = usePermissions()
  const assignments = useRolePermissions()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const setPermission = useSetRolePermission()
  const removePermission = useRemoveRolePermission()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { list } = adminMessages

  if (roles.isLoading) {
    return <LoadingList rows={3} />
  }
  if (roles.isError) {
    return <ErrorAlert message={list.error} />
  }

  const roleList = roles.data ?? []
  const selected =
    roleList.find((role) => role.id === selectedId) ?? roleList[0]

  return (
    <div className="flex flex-col gap-6">
      <RoleCreateForm
        onCreate={(values) => createRole.mutate(values)}
        isSaving={createRole.isPending}
      />
      <RoleTabs
        roles={roleList}
        selectedId={selected ? selected.id : null}
        onSelect={setSelectedId}
      />
      {selected ? (
        <RolePanel
          role={selected}
          permissions={permissions.data ?? []}
          assignments={assignments.data ?? []}
          isSaving={updateRole.isPending}
          onSave={(values) => updateRole.mutate({ id: selected.id, values })}
          onSet={(permissionId, scope) =>
            setPermission.mutate({ roleId: selected.id, permissionId, scope })
          }
          onRemove={(permissionId) =>
            removePermission.mutate({ roleId: selected.id, permissionId })
          }
        />
      ) : null}
    </div>
  )
}
