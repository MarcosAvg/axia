import { apiFetch } from '@/lib/api-client'
import type { ManualTimeContext, ManualTimeSpan } from '../domain/types'
import type { ManualTimeInput } from '../schemas'

export interface ManualTimePage {
  items: ManualTimeSpan[]
  context: ManualTimeContext
}

export async function fetchManualTimeContext(
  ticketId: string,
): Promise<ManualTimePage> {
  return apiFetch<ManualTimePage>(`/api/tickets/${ticketId}/manual-time`)
}

export async function recordManualTime(
  ticketId: string,
  input: ManualTimeInput,
  clientRequestId: string,
): Promise<void> {
  await apiFetch(`/api/tickets/${ticketId}/manual-time`, {
    method: 'POST',
    body: JSON.stringify({
      kind: input.kind,
      clockClass: input.clockClass,
      technicianId: input.technicianId || undefined,
      startedAt: input.startedAt,
      endedAt: input.endedAt || undefined,
      replacesSpanId: input.replacesSpanId || undefined,
      clientRequestId,
    }),
  })
}

export async function voidManualTime(
  ticketId: string,
  spanId: string,
  _clientRequestId: string,
): Promise<void> {
  void _clientRequestId
  await apiFetch(`/api/tickets/${ticketId}/manual-time/${spanId}/void`, {
    method: 'POST',
  })
}
