import { apiFetch } from '@/lib/api-client'
import type { NotificationItem } from '../domain/notification'

export interface NotificationPage {
  items: NotificationItem[]
  unread: number
}

export async function listNotifications(
  unread = false,
): Promise<NotificationPage> {
  return apiFetch<NotificationPage>(
    `/api/notifications?unread=${unread ? 'true' : 'false'}&limit=50`,
  )
}

export async function fetchUnreadCount(): Promise<number> {
  const body = await apiFetch<{ count: number }>(
    '/api/notifications/unread-count',
  )
  return body.count
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' })
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
  })
}

export interface TicketChange {
  id: number
  ticketId: string
  type: string
  occurredAt: string
}

export async function fetchChanges(since: number): Promise<TicketChange[]> {
  const body = await apiFetch<{ items: TicketChange[] }>(
    `/api/events/changes?since=${since}`,
  )
  return body.items
}
