import type { TicketActionPayload } from '@/features/tickets/api/offline-actions'
import {
  sendSyncBatch,
  type SyncItem,
  type SyncResult,
} from '@/features/tickets/api/sync-api'
import { db, type OutboxItem } from './db'

const TICKET_ACTION = 'ticket_action'

export function buildSyncItem(item: OutboxItem): SyncItem | null {
  if (item.type !== TICKET_ACTION) return null
  const payload = item.payload as Partial<TicketActionPayload> | null
  if (
    !payload ||
    typeof payload.ticketId !== 'string' ||
    typeof payload.operation !== 'string' ||
    typeof payload.clientRequestId !== 'string'
  ) {
    return null
  }
  return {
    clientRequestId: payload.clientRequestId,
    ticketId: payload.ticketId,
    type: payload.operation,
    args: payload.args ?? {},
    occurredAt:
      typeof payload.occurredAt === 'string'
        ? payload.occurredAt
        : new Date(item.createdAt).toISOString(),
  }
}

export async function applySyncResults(
  items: OutboxItem[],
  results: SyncResult[],
) {
  const byClientId = new Map(
    results.map((result) => [result.clientRequestId, result]),
  )
  for (const item of items) {
    const payload = item.payload as Partial<TicketActionPayload> | null
    const result = byClientId.get(payload?.clientRequestId ?? '')
    if (!result) {
      await db.outbox.update(item.id, {
        state: 'error',
        lastError: 'El servidor no devolvió resultado para la acción',
      })
      continue
    }
    if (result.status === 'applied' || result.status === 'duplicate') {
      await db.outbox.delete(item.id)
      continue
    }
    await db.outbox.update(item.id, {
      state: result.status === 'blocked' ? 'blocked' : 'error',
      lastError: result.message ?? result.code ?? result.status,
      result,
    })
  }
}

export async function syncPendingTicketActions(): Promise<SyncResult[]> {
  const items = await db.outbox.where('state').equals('pending').toArray()
  items.sort((a, b) => a.seq - b.seq)
  const syncable = items
    .map((item) => ({ item, sync: buildSyncItem(item) }))
    .filter(
      (entry): entry is { item: OutboxItem; sync: SyncItem } =>
        entry.sync !== null,
    )
  if (syncable.length === 0) return []

  try {
    const results = await sendSyncBatch(syncable.map((entry) => entry.sync))
    await applySyncResults(
      syncable.map((entry) => entry.item),
      results,
    )
    return results
  } catch (error) {
    await Promise.all(
      syncable.map(({ item }) =>
        db.outbox.update(item.id, {
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        }),
      ),
    )
    throw error
  }
}
