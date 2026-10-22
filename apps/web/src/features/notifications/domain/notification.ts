import { eventLabels } from '@/features/tickets'

export interface NotificationItem {
  id: string
  ticketId: string | null
  ticketFolio: string | null
  type: string
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

/** Etiqueta legible del evento, con el identificador como respaldo. */
export function notificationLabel(type: string): string {
  return (eventLabels as Record<string, string>)[type] ?? type
}

/** Número compacto para la campana. */
export function unreadBadge(count: number): string {
  return count > 9 ? '9+' : String(count)
}
