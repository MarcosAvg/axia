import { useState } from 'react'
import { toast } from 'sonner'
import { nextSort } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { CreateUserInput } from '../api/users-api'
import type { LinkablePerson, Profile, Role, UserRole } from '../domain/access'
import {
  canDeactivateProfile,
  canDeleteProfile,
  canRemoveUserRole,
  guardMessage,
  type AccessContext,
  type GuardResult,
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
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useRevokeUserSessions,
  useUserAccounts,
} from './use-users'

const EMPTY_PEOPLE: {
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
} = { requesters: [], technicians: [] }

/** Consultas y listas derivadas de la pestaña de cuentas. */
export function useAccountsData() {
  const profiles = useProfiles()
  const accounts = useUserAccounts()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const people = usePeople()
  const roleList = roles.data ?? []
  const assignmentList = userRoles.data ?? []
  const accountsById = new Map(
    (accounts.data ?? []).map((account) => [account.id, account]),
  )
  const profileList = (profiles.data ?? []).map((profile) => {
    const account = accountsById.get(profile.id)
    return {
      ...profile,
      username: account?.username,
      lastLoginAt: account?.lastLoginAt ?? null,
      mustChangePassword: account?.mustChangePassword,
      accountRoles: account?.roles,
    }
  })
  const peopleData = people.data ?? EMPTY_PEOPLE
  return {
    profiles,
    accounts,
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

function accessContext(input: AccountsActionsInput): AccessContext {
  return {
    profiles: input.profileList,
    roles: input.roleList,
    assignments: input.assignmentList,
    currentUserId: input.currentUserId,
  }
}

function allowOrToast(guard: GuardResult): boolean {
  if (guard.allowed) return true
  toast.error(guardMessage(guard.reason))
  return false
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
    if (allowOrToast(canDeactivateProfile(profile, accessContext(input)))) {
      setConfirming(profile)
    }
  }

  function confirmToggle() {
    if (!confirming) return
    setActive.mutate(
      { id: confirming.id, active: !confirming.active },
      { onSuccess: () => setConfirming(null) },
    )
  }

  function requestDelete(profile: Profile): boolean {
    return allowOrToast(canDeleteProfile(profile, accessContext(input)))
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
    requestDelete,
    removeRole,
  }
}

export type AccountAction = {
  kind: 'reset' | 'revoke' | 'delete'
  profile: Profile
}

interface PasswordState {
  mode: 'created' | 'reset'
  username: string
  password: string
}

/** Estado y mutaciones de las acciones de cuenta: alta, reset y revocación. */
export function useAccountMutations() {
  const create = useCreateUser()
  const reset = useResetUserPassword()
  const revoke = useRevokeUserSessions()
  const remove = useDeleteUser()
  const [creating, setCreating] = useState(false)
  const [action, setAction] = useState<AccountAction | null>(null)
  const [password, setPassword] = useState<PasswordState | null>(null)

  function handleCreate(input: CreateUserInput) {
    create.mutate(input, {
      onSuccess: (result) => {
        setCreating(false)
        setPassword({
          mode: 'created',
          username: result.user.username,
          password: result.temporaryPassword,
        })
      },
    })
  }

  function handleReset() {
    if (!action || action.kind !== 'reset') return
    reset.mutate(action.profile.id, {
      onSuccess: (result) => {
        setPassword({
          mode: 'reset',
          username: action.profile.username ?? action.profile.fullName,
          password: result.temporaryPassword,
        })
        setAction(null)
      },
    })
  }

  function handleRevoke() {
    if (!action || action.kind !== 'revoke') return
    revoke.mutate(action.profile.id, { onSuccess: () => setAction(null) })
  }

  function handleDelete() {
    if (!action || action.kind !== 'delete') return
    remove.mutate(action.profile.id, { onSuccess: () => setAction(null) })
  }

  return {
    create,
    reset,
    revoke,
    remove,
    creating,
    setCreating,
    action,
    setAction,
    password,
    setPassword,
    handleCreate,
    handleReset,
    handleRevoke,
    handleDelete,
    isActionPending: reset.isPending || revoke.isPending || remove.isPending,
  }
}
