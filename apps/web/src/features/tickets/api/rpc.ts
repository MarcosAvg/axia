import { apiFetch } from '@/lib/api-client'

/** Ejecuta una acción de tiquet; todas pasan por la misma ruta y son idempotentes. */
export async function ticketAction(
  ticketId: string,
  action: string,
  clientRequestId: string,
  fields: Record<string, unknown> = {},
): Promise<void> {
  await apiFetch(`/api/tickets/${ticketId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action,
      clientRequestId,
      ...fields,
    }),
  })
}
