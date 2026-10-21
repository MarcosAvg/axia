import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sendSyncBatch } from '@/features/tickets/api/sync-api'
import { db, type OutboxItem } from './db'
import {
  applySyncResults,
  buildSyncItem,
  syncPendingTicketActions,
} from './ticket-sync'

vi.mock('@/features/tickets/api/sync-api', () => ({
  sendSyncBatch: vi.fn(),
}))

const sendSyncBatchMock = vi.mocked(sendSyncBatch)

function outboxItem(overrides: Partial<OutboxItem> = {}): OutboxItem {
  const clientRequestId = crypto.randomUUID()
  return {
    id: crypto.randomUUID(),
    seq: 1,
    type: 'ticket_action',
    payload: {
      operation: 'comment',
      ticketId: 'ticket-1',
      args: { text: 'offline' },
      clientRequestId,
      occurredAt: '2026-10-21T10:00:00.000Z',
    },
    state: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
    ...overrides,
  }
}

beforeEach(async () => {
  await db.outbox.clear()
  sendSyncBatchMock.mockReset()
})

describe('ticket sync mapping', () => {
  it('builds a sync item from a queued ticket action', () => {
    const item = outboxItem()
    expect(buildSyncItem(item)).toEqual({
      clientRequestId: (item.payload as { clientRequestId: string })
        .clientRequestId,
      ticketId: 'ticket-1',
      type: 'comment',
      args: { text: 'offline' },
      occurredAt: '2026-10-21T10:00:00.000Z',
    })
  })

  it('returns null for another outbox type', () => {
    expect(buildSyncItem(outboxItem({ type: 'evidence_upload' }))).toBeNull()
  })
})

describe('ticket sync results', () => {
  it('deletes applied and duplicate items and keeps failures visible', async () => {
    const applied = outboxItem()
    const duplicate = outboxItem()
    const rejected = outboxItem()
    const blocked = outboxItem()
    await db.outbox.bulkAdd([applied, duplicate, rejected, blocked])

    const clientId = (item: OutboxItem) =>
      (item.payload as { clientRequestId: string }).clientRequestId
    await applySyncResults(
      [applied, duplicate, rejected, blocked],
      [
        { clientRequestId: clientId(applied), status: 'applied' },
        { clientRequestId: clientId(duplicate), status: 'duplicate' },
        {
          clientRequestId: clientId(rejected),
          status: 'rejected',
          code: 'conflict',
          message: 'Estado inválido',
        },
        {
          clientRequestId: clientId(blocked),
          status: 'blocked',
          blockedBy: clientId(rejected),
        },
      ],
    )

    expect(await db.outbox.get(applied.id)).toBeUndefined()
    expect(await db.outbox.get(duplicate.id)).toBeUndefined()
    expect(await db.outbox.get(rejected.id)).toMatchObject({
      state: 'error',
      lastError: 'Estado inválido',
    })
    expect(await db.outbox.get(blocked.id)).toMatchObject({
      state: 'blocked',
    })
  })

  it('sends pending ticket actions and applies the response', async () => {
    const item = outboxItem()
    await db.outbox.add(item)
    sendSyncBatchMock.mockResolvedValue([
      {
        clientRequestId: (item.payload as { clientRequestId: string })
          .clientRequestId,
        status: 'applied',
      },
    ])

    const results = await syncPendingTicketActions()

    expect(results).toHaveLength(1)
    expect(sendSyncBatchMock).toHaveBeenCalledWith([
      expect.objectContaining({
        clientRequestId: (item.payload as { clientRequestId: string })
          .clientRequestId,
        type: 'comment',
      }),
    ])
    expect(await db.outbox.count()).toBe(0)
  })
})
