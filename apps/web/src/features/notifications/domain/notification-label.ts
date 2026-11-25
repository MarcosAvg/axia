import { eventLabels } from '@/features/tickets'

/** Etiqueta legible del evento, con el identificador como respaldo. */
export function notificationLabel(type: string): string {
  return (eventLabels as Record<string, string>)[type] ?? type
}
