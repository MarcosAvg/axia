import { apiFetch } from '@/lib/api-client'
import type { ManualTimeSpan } from '../domain/types'
import type { ManualTimeInput } from '../schemas'

export async function fetchManualTimeSpans(
  ticketId: string,
): Promise<ManualTimeSpan[]> {
  const body = await apiFetch<{ items: ManualTimeSpan[] }>(
    `/api/tickets/${ticketId}/manual-time`,
  )
  return body.items
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
      endedAt: input.endedAt,
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
