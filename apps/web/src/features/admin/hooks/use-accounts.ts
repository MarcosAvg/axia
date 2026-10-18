import { useState } from 'react'
import { toast } from 'sonner'
import { nextSort } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { LinkablePerson, Profile, Role, UserRole } from '../domain/access'
import {
  canDeactivateProfile,
  canRemoveUserRole,
  guardMessage,
} from '../domain/access-guards'
import {
  useAssignUserRole,
  usePeople,
  useProfiles,
  useRemoveUserRole,
  useRoles,
  useSetProfileActive,
  useUserRoles,
} from './use-access'

const EMPTY_PEOPLE: {
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
} = { requesters: [], technicians: [] }

/** Consultas y listas derivadas de la pestaña de cuentas. */
export function useAccountsData() {
  const profiles = useProfiles()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const people = usePeople()
  const roleList = roles.data ?? []
  const assignmentList = userRoles.data ?? []
  const profileList = profiles.data ?? []
  const peopleData = people.data ?? EMPTY_PEOPLE
  return {
    profiles,
    people,
    roleList,
    assignmentList,
    profileList,
    peopleData,
  }
}

interface AccountsActionsInput {
  currentUserId?: string
  profileList: Profile[]
  roleList: Role[]
  assignmentList: UserRole[]
}

/** Estado de edición y guardarraíles de las cuentas. */
export function useAccountsActions(input: AccountsActionsInput) {
  const assign = useAssignUserRole()
  const remove = useRemoveUserRole()
  const setActive = useSetProfileActive()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [confirming, setConfirming] = useState<Profile | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)

  function requestToggle(profile: Profile) {
    const guard = canDeactivateProfile(profile, {
      profiles: input.profileList,
      roles: input.roleList,
      assignments: input.assignmentList,
      currentUserId: input.currentUserId,
    })
    if (!guard.allowed) {
      toast.error(guardMessage(guard.reason))
      return
    }
    setConfirming(profile)
  }

  function confirmToggle() {
    if (!confirming) return
    setActive.mutate(
      { id: confirming.id, active: !confirming.active },
      { onSuccess: () => setConfirming(null) },
    )
  }

  function removeRole(roleId: string) {
    if (!editing) return
    const role = input.roleList.find((item) => item.id === roleId)
    if (!role) return
    const guard = canRemoveUserRole(editing.id, role, {
      profiles: input.profileList,
      roles: input.roleList,
      assignments: input.assignmentList,
    })
    if (!guard.allowed) {
      toast.error(guardMessage(guard.reason))
      return
    }
    remove.mutate({ userId: editing.id, roleId })
  }

  return {
    assign,
    remove,
    setActive,
    editing,
    setEditing,
    confirming,
    setConfirming,
    query,
    setQuery,
    sort,
    toggleSort: (key: string) => setSort((current) => nextSort(current, key)),
    requestToggle,
    confirmToggle,
    removeRole,
  }
}
