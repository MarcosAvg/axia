import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '../api/users-api'
import type { CreateUserInput } from '../api/users-api'
import { adminMessages } from '../i18n'

const usersKey = ['admin', 'users'] as const

export function useUserAccounts() {
  return useQuery({
    queryKey: usersKey,
    queryFn: api.listUserAccounts,
  })
}

function useUserMutation<TVariables, TResult>(
  fn: (variables: TVariables) => Promise<TResult>,
  successMessage?: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      if (successMessage) toast.success(successMessage)
    },
    onError: () => toast.error(adminMessages.actions.error),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.createUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: () => toast.error(adminMessages.actions.error),
  })
}

export function useResetUserPassword() {
  return useUserMutation(
    (id: string) => api.resetUserPassword(id),
    adminMessages.users.passwordReset,
  )
}

export function useRevokeUserSessions() {
  return useUserMutation(
    (id: string) => api.revokeUserSessions(id),
    adminMessages.users.sessionsRevoked,
  )
}
