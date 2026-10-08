import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/access-api'
import type { Scope } from '../domain/access'

const accessKeys = {
  roles: ['admin', 'roles'] as const,
  permissions: ['admin', 'permissions'] as const,
  rolePermissions: ['admin', 'role-permissions'] as const,
  profiles: ['admin', 'profiles'] as const,
  userRoles: ['admin', 'user-roles'] as const,
  people: ['admin', 'people'] as const,
  scopes: ['admin', 'supervisor-scopes'] as const,
  technicianCategories: ['admin', 'technician-categories'] as const,
}

function useAccessMutation<TVariables>(
  fn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useRoles() {
  return useQuery({ queryKey: accessKeys.roles, queryFn: api.listRoles })
}
export function usePermissions() {
  return useQuery({
    queryKey: accessKeys.permissions,
    queryFn: api.listPermissions,
  })
}
export function useRolePermissions() {
  return useQuery({
    queryKey: accessKeys.rolePermissions,
    queryFn: api.listRolePermissions,
  })
}
export function useProfiles() {
  return useQuery({ queryKey: accessKeys.profiles, queryFn: api.listProfiles })
}
export function useUserRoles() {
  return useQuery({
    queryKey: accessKeys.userRoles,
    queryFn: api.listUserRoles,
  })
}
export function usePeople() {
  return useQuery({
    queryKey: accessKeys.people,
    queryFn: api.listLinkablePeople,
  })
}
export function useSupervisorScopes() {
  return useQuery({
    queryKey: accessKeys.scopes,
    queryFn: api.listSupervisorScopes,
  })
}
export function useTechnicianCategories() {
  return useQuery({
    queryKey: accessKeys.technicianCategories,
    queryFn: api.listTechnicianCategories,
  })
}

export function useCreateRole() {
  return useAccessMutation(api.createRole)
}
export function useUpdateRole() {
  return useAccessMutation(
    (variables: { id: string; values: { label?: string; active?: boolean } }) =>
      api.updateRole(variables.id, variables.values),
  )
}
export function useSetRolePermission() {
  return useAccessMutation(
    (variables: { roleId: string; permissionId: string; scope: Scope }) =>
      api.setRolePermission(
        variables.roleId,
        variables.permissionId,
        variables.scope,
      ),
  )
}
export function useRemoveRolePermission() {
  return useAccessMutation(
    (variables: { roleId: string; permissionId: string }) =>
      api.removeRolePermission(variables.roleId, variables.permissionId),
  )
}
export function useAssignUserRole() {
  return useAccessMutation((variables: { userId: string; roleId: string }) =>
    api.assignUserRole(variables.userId, variables.roleId),
  )
}
export function useRemoveUserRole() {
  return useAccessMutation((variables: { userId: string; roleId: string }) =>
    api.removeUserRole(variables.userId, variables.roleId),
  )
}
export function useSetProfileActive() {
  return useAccessMutation((variables: { id: string; active: boolean }) =>
    api.setProfileActive(variables.id, variables.active),
  )
}
export function useLinkRequesterUser() {
  return useAccessMutation(
    (variables: { requesterId: string; userId: string | null }) =>
      api.linkRequesterUser(variables.requesterId, variables.userId),
  )
}
export function useLinkTechnicianUser() {
  return useAccessMutation(
    (variables: { technicianId: string; userId: string | null }) =>
      api.linkTechnicianUser(variables.technicianId, variables.userId),
  )
}
export function useCreateSupervisorScope() {
  return useAccessMutation((variables: { userId: string; teamId: string }) =>
    api.createSupervisorScope(variables.userId, variables.teamId),
  )
}
export function useDeleteSupervisorScope() {
  return useAccessMutation((variables: { id: string }) =>
    api.deleteSupervisorScope(variables.id),
  )
}
export function useAddScopeBuilding() {
  return useAccessMutation(
    (variables: { scopeId: string; buildingId: string }) =>
      api.addScopeBuilding(variables.scopeId, variables.buildingId),
  )
}
export function useRemoveScopeBuilding() {
  return useAccessMutation(
    (variables: { scopeId: string; buildingId: string }) =>
      api.removeScopeBuilding(variables.scopeId, variables.buildingId),
  )
}
export function useAddTechnicianCategory() {
  return useAccessMutation(
    (variables: { technicianId: string; categoryId: string }) =>
      api.addTechnicianCategory(variables.technicianId, variables.categoryId),
  )
}
export function useRemoveTechnicianCategory() {
  return useAccessMutation(
    (variables: { technicianId: string; categoryId: string }) =>
      api.removeTechnicianCategory(
        variables.technicianId,
        variables.categoryId,
      ),
  )
}
