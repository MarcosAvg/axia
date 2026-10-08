import { db } from './db'
import type { OutboxItem } from './db'

export type OutboxHandler = (payload: unknown) => Promise<void>

const handlers = new Map<string, OutboxHandler>()

/** Registra el manejador de un tipo de ítem de la cola. */
export function registerOutboxHandler(type: string, handler: OutboxHandler) {
  handlers.set(type, handler)
}

/** Encola una operación y devuelve su identificador. */
export async function enqueue(type: string, payload: unknown): Promise<string> {
  const id = crypto.randomUUID()
  await db.outbox.add({
    id,
    type,
    payload,
    state: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
  })
  return id
}

const MAX_ATTEMPTS = 5
let isProcessing = false
let afterProcess: (() => void) | null = null

/** Registra un aviso que se dispara al terminar de procesar la cola. */
export function onOutboxProcessed(callback: () => void) {
  afterProcess = callback
}

/** Procesa la cola en orden; reintenta los fallos hasta el límite. */
export async function processOutbox(): Promise<void> {
  if (isProcessing) return
  isProcessing = true
  try {
    const items = await db.outbox.orderBy('createdAt').toArray()
    for (const item of items) {
      await processItem(item)
    }
  } finally {
    isProcessing = false
    afterProcess?.()
  }
}

async function processItem(item: OutboxItem): Promise<void> {
  const handler = handlers.get(item.type)
  if (!handler) {
    await db.outbox.update(item.id, {
      state: 'error',
      lastError: `Sin manejador para ${item.type}`,
    })
    return
  }
  await db.outbox.update(item.id, { state: 'sending' })
  try {
    await handler(item.payload)
    await db.outbox.delete(item.id)
  } catch (error) {
    const attempts = item.attempts + 1
    await db.outbox.update(item.id, {
      state: attempts >= MAX_ATTEMPTS ? 'error' : 'pending',
      attempts,
      lastError: error instanceof Error ? error.message : String(error),
    })
  }
}
