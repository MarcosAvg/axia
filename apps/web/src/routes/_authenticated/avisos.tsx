import { createFileRoute } from '@tanstack/react-router'
import { BellIcon, CheckCheckIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { RequirePermission } from '@/features/auth'
import {
  NotificationList,
  notificationMessages,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notifications'

export const Route = createFileRoute('/_authenticated/avisos')({
  component: NotificationsPage,
})

function NotificationsPage() {
  return (
    <RequirePermission permission="ticket.view">
      <NotificationsContent />
    </RequirePermission>
  )
}

function NotificationsContent() {
  const notifications = useNotifications()
  const unread = useUnreadCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const items = notifications.data?.items ?? []

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageHeader
        title={notificationMessages.title}
        description={notificationMessages.subtitle}
        actions={
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!unread.data || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheckIcon />
            {notificationMessages.markAll}
          </Button>
        }
      />
      {notifications.isLoading ? <LoadingList rows={5} /> : null}
      {notifications.isError ? (
        <ErrorAlert
          message={notificationMessages.error}
          action={
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => void notifications.refetch()}
            >
              {notificationMessages.retry}
            </Button>
          }
        />
      ) : null}
      {!notifications.isLoading &&
      !notifications.isError &&
      items.length === 0 ? (
        <EmptyState icon={BellIcon} title={notificationMessages.empty} />
      ) : null}
      {items.length > 0 ? (
        <NotificationList
          items={items}
          onMarkRead={(id) => markRead.mutate(id)}
        />
      ) : null}
    </div>
  )
}
