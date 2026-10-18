import { useState } from 'react'
import {
  useCreateRole,
  usePermissions,
  useRemoveRolePermission,
  useRolePermissions,
  useRoles,
  useSetRolePermission,
  useUpdateRole,
} from './use-access'

/** Consultas y mutaciones de la pantalla de roles, en un solo lugar. */
export function useRolesController() {
  const roles = useRoles()
  const permissions = usePermissions()
  const assignments = useRolePermissions()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const setRolePermission = useSetRolePermission()
  const removeRolePermission = useRemoveRolePermission()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const roleList = roles.data ?? []
  const selected =
    roleList.find((role) => role.id === selectedId) ?? roleList[0]

  return {
    isLoading: roles.isLoading,
    isError: roles.isError,
    roleList,
    selected,
    creating,
    permissions: permissions.data ?? [],
    assignments: assignments.data ?? [],
    isCreating: createRole.isPending,
    isSaving: updateRole.isPending,
    select: (id: string) => {
      setCreating(false)
      setSelectedId(id)
    },
    startCreate: () => setCreating(true),
    cancelCreate: () => setCreating(false),
    create: (values: { name: string; label: string }) =>
      createRole.mutate(values, {
        onSuccess: () => setCreating(false),
      }),
    save: (values: { label: string; active: boolean }) => {
      if (selected) updateRole.mutate({ id: selected.id, values })
    },
    setPermission: (
      permissionId: string,
      scope: Parameters<typeof setRolePermission.mutate>[0]['scope'],
    ) => {
      if (selected) {
        setRolePermission.mutate({
          roleId: selected.id,
          permissionId,
          scope,
        })
      }
    },
    removePermission: (permissionId: string) => {
      if (selected) {
        removeRolePermission.mutate({ roleId: selected.id, permissionId })
      }
    },
  }
}
