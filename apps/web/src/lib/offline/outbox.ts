import { db } from './db'
import type { OutboxItem } from './db'
import { isNetworkError, OutboxError } from './errors'
import { currentOfflineUserId } from './user'

export type OutboxHandler = (payload: unknown) => Promise<void>
export type OutboxDiscardHandler = (payload: unknown) => Promise<void>

const handlers = new Map<string, OutboxHandler>()
const discarders = new Map<string, OutboxDiscardHandler>()
const orderingKeys = new Map<
  string,
  (payload: unknown) => Promise<string | undefined>
>()

/** Registra el manejador de un tipo de ítem de la cola y su limpieza al descartar. */
export function registerOutboxHandler(
  type: string,
  handler: OutboxHandler,
  discard?: OutboxDiscardHandler,
  orderingKey?: (payload: unknown) => Promise<string | undefined>,
) {
  handlers.set(type, handler)
  if (discard) discarders.set(type, discard)
  if (orderingKey) orderingKeys.set(type, orderingKey)
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
export async function enqueue(
  type: string,
  payload: unknown,
  orderingKey?: string,
): Promise<void> {
  await exclusive(async () => {
    await db.outbox.add({
      id: crypto.randomUUID(),
      seq: nextSeq(),
      type,
      userId: currentOfflineUserId() ?? undefined,
      payload,
      orderingKey,
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
      // Los errores también son barreras: el bloqueo se conserva entre invocaciones.
      const items = await db.outbox.toArray()
      const mine = items.filter((item) => item.userId === userId)
      mine.sort((a, b) => a.seq - b.seq)
      await processOrderedItems(mine, userId)
    })
  } finally {
    isProcessing = false
    afterProcess?.()
  }
}

async function processOrderedItems(items: OutboxItem[], userId: string) {
  const blocked = new Set<string>()
  for (const item of items) {
    const key =
      item.orderingKey ?? (await orderingKeys.get(item.type)?.(item.payload))
    if (currentOfflineUserId() !== userId) break
    if (key && blocked.has(key)) continue
    if (!(await processReadyItem(item)) && key) blocked.add(key)
  }
}

async function processReadyItem(item: OutboxItem): Promise<boolean> {
  if (item.state === 'error') return false
  if (
    item.state === 'sending' &&
    item.sendingAt &&
    item.sendingAt >= Date.now() - STALE_SENDING_MS
  )
    return false
  return processItem(item)
}

/** Elementos pendientes del usuario actual; el aviso no cuenta los de otra sesión. */
export async function pendingForCurrentUser(): Promise<number> {
  const userId = currentOfflineUserId()
  if (!userId) return 0
  const items = await db.outbox.where('state').equals('pending').toArray()
  return items.filter((item) => item.userId === userId).length
}

/** Elementos que agotaron los reintentos o fallaron de forma definitiva. */
export async function errorsForCurrentUser(): Promise<OutboxItem[]> {
  const userId = currentOfflineUserId()
  if (!userId) return []
  const items = await db.outbox.where('state').equals('error').toArray()
  return items
    .filter((item) => item.userId === userId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Devuelve un elemento con error a la cola, sin tocar los de otra sesión. */
export async function retryOutboxItem(id: string): Promise<void> {
  await exclusive(async () => {
    const item = await db.outbox.get(id)
    if (!item || item.userId !== currentOfflineUserId()) return
    await db.outbox.update(id, {
      state: 'pending',
      attempts: 0,
      lastError: null,
      lastErrorCode: null,
      sendingAt: null,
    })
  })
}

/** Corrige la hora de un envío rechazado y lo vuelve a poner en cola. */
export async function retryOutboxItemWithManualTime(
  id: string,
  occurredLocal: string,
): Promise<void> {
  await exclusive(async () => {
    const item = await db.outbox.get(id)
    if (!item || item.userId !== currentOfflineUserId()) return
    const payload =
      typeof item.payload === 'object' && item.payload !== null
        ? (item.payload as Record<string, unknown>)
        : {}
    await db.outbox.update(id, {
      payload: { ...payload, occurredLocal, manualTime: true },
      state: 'pending',
      attempts: 0,
      lastError: null,
      lastErrorCode: null,
      sendingAt: null,
    })
  })
}

/** Descarta un elemento con error y limpia sus datos locales asociados. */
export async function discardOutboxItem(id: string): Promise<void> {
  await exclusive(async () => {
    const item = await db.outbox.get(id)
    if (!item || item.userId !== currentOfflineUserId()) return
    await discarders.get(item.type)?.(item.payload)
    await db.outbox.delete(id)
  })
}

async function processItem(item: OutboxItem): Promise<boolean> {
  const handler = handlers.get(item.type)
  if (!handler) {
    await db.outbox.update(item.id, {
      state: 'error',
      lastError: `Sin manejador para ${item.type}`,
    })
    return false
  }
  await db.outbox.update(item.id, {
    state: 'sending',
    sendingAt: Date.now(),
  })
  if (currentOfflineUserId() !== item.userId) {
    await db.outbox.update(item.id, { state: 'pending', sendingAt: null })
    return false
  }
  try {
    await handler(item.payload)
    await db.outbox.delete(item.id)
    return true
  } catch (error) {
    const attempts = item.attempts + 1
    const permanent = !isNetworkError(error)
    await db.outbox.update(item.id, {
      state: permanent || attempts >= MAX_ATTEMPTS ? 'error' : 'pending',
      attempts,
      sendingAt: null,
      lastError: error instanceof Error ? error.message : String(error),
      lastErrorCode: error instanceof OutboxError ? error.code : null,
    })
    return false
  }
}
