import { apiFetch } from '@/lib/api-client'

export type SyncItem = {
  clientRequestId: string
  ticketId: string
  type: string
  args: Record<string, unknown>
  occurredAt: string
  manualTime?: boolean
}

type SyncStatus = 'applied' | 'duplicate' | 'rejected' | 'conflict' | 'blocked'

export type SyncResult = {
  clientRequestId: string
  status: SyncStatus
  code?: string
  message?: string
  details?: unknown
  currentState?: string
  eventId?: number
  blockedBy?: string
}

export async function sendSyncBatch(items: SyncItem[]): Promise<SyncResult[]> {
  const response = await apiFetch<{ results: SyncResult[] }>(
    '/api/sync/actions',
    {
      method: 'POST',
      body: JSON.stringify({ items }),
    },
  )
  return response.results
}
