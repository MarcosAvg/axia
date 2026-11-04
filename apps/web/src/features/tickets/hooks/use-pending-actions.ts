import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '@/features/auth'
import { db } from '@/lib/offline/db'
import type { OutboxItem } from '@/lib/offline/db'
import { ticketCommandSchema } from '../api/ticket-commands'
import type { PendingTicketAction } from '../domain/pending-actions'

function ticketIdOf(item: OutboxItem): string | undefined {
  if (item.orderingKey) return item.orderingKey
  const payload = item.payload as { ticketId?: unknown } | null
  return typeof payload?.ticketId === 'string' ? payload.ticketId : undefined
}

function toPendingAction(item: OutboxItem): PendingTicketAction | null {
  if (item.type !== 'ticket_action') return null
  const command = ticketCommandSchema.safeParse(item.payload)
  if (!command.success) return null
  const payload = item.payload as {
    ticketId?: unknown
    occurredAt?: unknown
  }
  if (typeof payload.ticketId !== 'string' || !payload.ticketId) return null
  return {
    id: item.id,
    ticketId: payload.ticketId,
    seq: item.seq,
    operation: command.data.operation,
    args: { ...command.data.args },
    occurredAt:
      typeof payload.occurredAt === 'string'
        ? payload.occurredAt
        : new Date(item.createdAt).toISOString(),
  }
}

function groupByTicket(
  items: OutboxItem[],
  userId: string,
): Map<string, OutboxItem[]> {
  const groups = new Map<string, OutboxItem[]>()
  for (const item of items) {
    if (item.userId !== userId) continue
    const ticketId = ticketIdOf(item)
    if (!ticketId) continue
    const group = groups.get(ticketId) ?? []
    group.push(item)
    groups.set(ticketId, group)
  }
  return groups
}

function actionsFromGroup(group: OutboxItem[]): PendingTicketAction[] {
  const actions: PendingTicketAction[] = []
  group.sort((a, b) => a.seq - b.seq)
  for (const item of group) {
    if (item.state === 'error') break
    if (item.type !== 'ticket_action') continue
    const action = toPendingAction(item)
    if (!action) break
    actions.push(action)
  }
  return actions
}

/**
 * Lee la cola por tiquet y se detiene en el primer elemento que la bloquearía:
 * un error definitivo o un comando que ya no se puede interpretar.
 */
async function readPendingActions(
  userId: string | undefined,
): Promise<PendingTicketAction[]> {
  if (!userId) return []
  const items = await db.outbox.toArray()
  const groups = groupByTicket(items, userId)
  return [...groups.values()].flatMap(actionsFromGroup)
}

/** Acciones offline de todos los tiquets del usuario actual. */
export function usePendingActions(): PendingTicketAction[] {
  const { session } = useAuth()
  const userId = session?.user.id
  return useLiveQuery(async () => readPendingActions(userId), [userId], [])
}

/** Acciones offline pendientes de un tiquet. */
export function usePendingTicketActions(
  ticketId: string | undefined,
): PendingTicketAction[] {
  const actions = usePendingActions()
  return useMemo(
    () =>
      ticketId ? actions.filter((item) => item.ticketId === ticketId) : [],
    [actions, ticketId],
  )
}
