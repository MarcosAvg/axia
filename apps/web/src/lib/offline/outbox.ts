import { db } from './db'
import type { OutboxItem } from './db'
import { isNetworkError } from './errors'
import { currentOfflineUserId } from './user'

export type OutboxHandler = (payload: unknown) => Promise<void>

const handlers = new Map<string, OutboxHandler>()

/** Registra el manejador de un tipo de ítem de la cola. */
export function registerOutboxHandler(type: string, handler: OutboxHandler) {
  handlers.set(type, handler)
}

let seqCounter = 0

/** Secuencia monótona para ordenar la cola de forma determinista. */
function nextSeq(): number {
  seqCounter += 1
  return Date.now() * 1000 + (seqCounter % 1000)
}

// Serializa las operaciones sobre IndexedDB para que encolar y procesar no se pisen
// (procesar puede tardar en subir la evidencia y bloquearía una escritura concurrente).
let chain: Promise<unknown> = Promise.resolve()
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** Encola una operación (primero lo que se encoló antes). */
export async function enqueue(type: string, payload: unknown): Promise<void> {
  await exclusive(async () => {
    await db.outbox.add({
      id: crypto.randomUUID(),
      seq: nextSeq(),
      type,
      userId: currentOfflineUserId() ?? undefined,
      payload,
      state: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: Date.now(),
    })
  })
}

const MAX_ATTEMPTS = 5
const STALE_SENDING_MS = 60_000
let isProcessing = false
let afterProcess: (() => void) | null = null

/** Registra un aviso que se dispara al terminar de procesar la cola. */
export function onOutboxProcessed(callback: () => void) {
  afterProcess = callback
}

/** Procesa la cola en orden; reintenta los fallos hasta el límite. */
export async function processOutbox(): Promise<void> {
  // Sin conexión no hay nada que enviar; se reintenta al recuperar la red.
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  if (isProcessing) return
  const userId = currentOfflineUserId()
  if (!userId) return
  isProcessing = true
  try {
    await exclusive(async () => {
      if (currentOfflineUserId() !== userId) return
      const items = await db.outbox
        .where('state')
        .anyOf('pending', 'sending')
        .toArray()
      const mine = items.filter(
        (item) =>
          item.userId === userId &&
          (item.state === 'pending' ||
            !item.sendingAt ||
            item.sendingAt < Date.now() - STALE_SENDING_MS),
      )
      mine.sort((a, b) => a.seq - b.seq)
      for (const item of mine) {
        await processItem(item)
      }
    })
  } finally {
    isProcessing = false
    afterProcess?.()
  }
}

/** Elementos pendientes del usuario actual; el aviso no cuenta los de otra sesión. */
export async function pendingForCurrentUser(): Promise<number> {
  const userId = currentOfflineUserId()
  if (!userId) return 0
  const items = await db.outbox.where('state').equals('pending').toArray()
  return items.filter((item) => item.userId === userId).length
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
  await db.outbox.update(item.id, {
    state: 'sending',
    sendingAt: Date.now(),
  })
  try {
    await handler(item.payload)
    await db.outbox.delete(item.id)
  } catch (error) {
    const attempts = item.attempts + 1
    const permanent = !isNetworkError(error)
    await db.outbox.update(item.id, {
      state: permanent || attempts >= MAX_ATTEMPTS ? 'error' : 'pending',
      attempts,
      sendingAt: null,
      lastError: error instanceof Error ? error.message : String(error),
    })
  }
}
