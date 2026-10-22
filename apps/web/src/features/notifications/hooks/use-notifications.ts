import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '../api/notifications-api'
import { notificationMessages } from '../i18n'

const keys = {
  list: (unread: boolean) => ['notifications', 'list', unread] as const,
  unread: ['notifications', 'unread'] as const,
}

function useNotificationMutation<TVariables, TResult>(
  fn: (variables: TVariables) => Promise<TResult>,
  successMessage?: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (successMessage) toast.success(successMessage)
    },
    onError: () => toast.error(notificationMessages.errorAction),
  })
}

export function useNotifications(unread = false) {
  return useQuery({
    queryKey: keys.list(unread),
    queryFn: () => api.listNotifications(unread),
    staleTime: 15 * 1000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: keys.unread,
    queryFn: api.fetchUnreadCount,
    staleTime: 30 * 1000,
  })
}

export function useMarkNotificationRead() {
  return useNotificationMutation(api.markNotificationRead)
}

export function useMarkAllNotificationsRead() {
  return useNotificationMutation(
    api.markAllNotificationsRead,
    notificationMessages.markedAll,
  )
}
