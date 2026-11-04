import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/offline/db'
import type { OutboxItem } from '@/lib/offline/db'
import { setOfflineUserId } from '@/lib/offline/user'
import {
  usePendingActions,
  usePendingTicketActions,
} from './use-pending-actions'

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ session: { user: { id: 'user-a' } } }),
}))

let seq = 0

function ticketAction(
  ticketId: string,
  operation: string,
  overrides: Partial<OutboxItem> = {},
  args: Record<string, unknown> = {},
): OutboxItem {
  seq += 1
  return {
    id: `item-${seq}`,
    seq,
    type: 'ticket_action',
    userId: 'user-a',
    payload: {
      operation,
      args,
      ticketId,
      clientRequestId: crypto.randomUUID(),
      occurredAt: '2026-11-04T10:00:00.000Z',
    },
    orderingKey: ticketId,
    state: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
    ...overrides,
  }
}

function evidenceUpload(ticketId: string): OutboxItem {
  seq += 1
  return {
    id: `item-${seq}`,
    seq,
    type: 'evidence_upload',
    userId: 'user-a',
    payload: { evidenceId: `evidence-${seq}` },
    orderingKey: ticketId,
    state: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
  }
}

beforeEach(async () => {
  seq = 0
  await db.outbox.clear()
  setOfflineUserId('user-a')
})

afterAll(() => {
  db.close()
  setOfflineUserId(null)
})

describe('usePendingTicketActions', () => {
  it('devuelve solo las acciones del tiquet en orden de envío', async () => {
    await db.outbox.bulkAdd([
      ticketAction('ticket-1', 'comment', { seq: 4 }, { text: 'nota' }),
      evidenceUpload('ticket-1'),
      ticketAction('ticket-1', 'start', { seq: 2 }),
      ticketAction('ticket-2', 'start'),
    ])

    const { result } = renderHook(() => usePendingTicketActions('ticket-1'))

    await waitFor(() => expect(result.current).toHaveLength(2))
    expect(result.current.map((item) => item.operation)).toEqual([
      'start',
      'comment',
    ])
  })

  it('ignora las acciones de otro usuario', async () => {
    await db.outbox.add(ticketAction('ticket-1', 'start', { userId: 'user-b' }))

    const { result } = renderHook(() => usePendingTicketActions('ticket-1'))

    await waitFor(() => expect(result.current).toHaveLength(0))
  })

  it('se detiene ante el primer error del tiquet', async () => {
    await db.outbox.bulkAdd([
      ticketAction('ticket-1', 'start', { state: 'error' }),
      ticketAction('ticket-1', 'pause', { seq: 2 }),
    ])

    const { result } = renderHook(() => usePendingTicketActions('ticket-1'))

    await waitFor(() => expect(result.current).toHaveLength(0))
  })

  it('se detiene ante un comando inválido', async () => {
    await db.outbox.bulkAdd([
      ticketAction('ticket-1', 'start', {
        payload: { operation: 'start', args: {} },
      }),
      ticketAction('ticket-1', 'pause', { seq: 2 }),
    ])

    const { result } = renderHook(() => usePendingTicketActions('ticket-1'))

    await waitFor(() => expect(result.current).toHaveLength(0))
  })
})

describe('usePendingActions', () => {
  it('agrupa por tiquet y no deja que un error bloquee a otro', async () => {
    await db.outbox.bulkAdd([
      ticketAction('ticket-1', 'start', { state: 'error' }),
      ticketAction('ticket-2', 'start'),
    ])

    const { result } = renderHook(() => usePendingActions())

    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current[0]?.ticketId).toBe('ticket-2')
  })
})
