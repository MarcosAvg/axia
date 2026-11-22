import { db } from './db'
import type { OutboxItem } from './db'
import { isNetworkError, isRetryableOutboxError, OutboxError } from './errors'
import { currentOfflineUserId, offlineUserForTab } from './user'

export type OutboxHandler = (payload: unknown) => Promise<void>
export type OutboxDiscardHandler = (payload: unknown) => Promise<void>

const handlers = new Map<string, OutboxHandler>()
const discarders = new Map<string, OutboxDiscardHandler>()
const orderingKeys = new Map<
  string,
  (payload: unknown) => Promise<string | undefined>
>()

function orderingKeyFor(item: OutboxItem) {
  return item.orderingKey ?? orderingKeys.get(item.type)?.(item.payload)
}

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

// Serializa el procesamiento con los cambios sobre entradas existentes.
let chain: Promise<unknown> = Promise.resolve()
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const withLock = () =>
    typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('axia-outbox', task)
      : task()
  const run = chain.then(withLock, withLock)
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
  owner: string | null = currentOfflineUserId(),
): Promise<void> {
  await db.outbox.add({
    id: crypto.randomUUID(),
    seq: nextSeq(),
    type,
    userId: owner ?? undefined,
    payload,
    orderingKey,
    state: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
  })
}

/** Mantiene las operaciones nuevas detrás del trabajo ya guardado del tiquet. */
export async function hasQueuedWork(ticketId: string): Promise<boolean> {
  const userId = currentOfflineUserId()
  if (!userId) return false
  const items = await db.outbox
    .filter((item) => item.userId === userId)
    .toArray()
  for (const item of items) {
    const key = await orderingKeyFor(item)
    if (key === ticketId) return true
  }
  return false
}

const STALE_SENDING_MS = 60_000
let pendingDrain: Promise<void> | null = null
type RefreshConfirmed = (
  keys: readonly string[],
) => ReadonlyMap<string, Promise<void>>
let afterProcess: RefreshConfirmed | null = null

/** Actualiza las vistas antes de retirar las operaciones confirmadas de la cola. */
export function onOutboxProcessed(callback: RefreshConfirmed) {
  afterProcess = callback
}

function sendingUser() {
  const userId = offlineUserForTab()
  return userId === currentOfflineUserId() ? userId : null
}

function canDrain(userId: string) {
  return navigator.onLine && sendingUser() === userId
}

async function drainOutbox(userId: string, hasLock: boolean) {
  if (!canDrain(userId)) return
  const items = await db.outbox
    .filter((item) => item.userId === userId)
    .toArray()
  items.sort((a, b) => a.seq - b.seq)
  const confirmed = await processOrderedItems(items, userId, hasLock)
  if (confirmed.size === 0) return
  const keys = [...confirmed.keys()].filter((key) => key !== undefined)
  const refreshes = canDrain(userId) ? afterProcess?.(keys) : undefined
  await Promise.all(
    [...confirmed].map(async ([key, ids]) => {
      try {
        if (key) await refreshes?.get(key)
      } catch {
        // El siguiente ciclo solo vuelve a consultar este tiquet.
        return
      }
      if (navigator.onLine || sendingUser() !== userId) {
        await db.outbox.bulkDelete(ids)
      }
    }),
  )
}

/** Procesa la cola en orden y serializa el envío entre pestañas cuando es posible. */
export async function processOutbox(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.onLine) return
  if (!sendingUser()) return
  if (pendingDrain) return pendingDrain

  const scheduled = exclusive(async () => {
    // A partir de aquí puede llegar trabajo que no esté en esta lectura.
    pendingDrain = null
    const userId = sendingUser()
    if (userId) await drainOutbox(userId, Boolean(navigator.locks))
  }).finally(() => {
    if (pendingDrain === scheduled) pendingDrain = null
  })
  pendingDrain = scheduled
  return scheduled
}

async function processOrderedItems(
  items: OutboxItem[],
  userId: string,
  hasLock: boolean,
) {
  const blocked = new Set<string>()
  const confirmed = new Map<string | undefined, string[]>()
  for (const item of items) {
    if (!canDrain(userId)) break
    const key = await orderingKeyFor(item)
    if (!canDrain(userId)) break
    if (item.state === 'confirmed') {
      addConfirmation(confirmed, key, item.id)
      continue
    }
    if (key && blocked.has(key)) continue
    if (await processReadyItem(item, hasLock)) {
      await db.outbox.update(item.id, {
        state: 'confirmed',
        orderingKey: key,
        sendingAt: null,
      })
      addConfirmation(confirmed, key, item.id)
    } else if (key) blocked.add(key)
  }
  return confirmed
}

function addConfirmation(
  confirmed: Map<string | undefined, string[]>,
  key: string | undefined,
  id: string,
) {
  const ids = confirmed.get(key) ?? []
  ids.push(id)
  confirmed.set(key, ids)
}

function isRecoverableLegacyError(item: OutboxItem): boolean {
  if (item.lastErrorCode) return item.lastErrorCode === 'internal_error'
  const message = item.lastError ?? ''
  return (
    isNetworkError(message) ||
    message === `Sin manejador para ${item.type}` ||
    (item.type === 'evidence_upload' &&
      /response code: (?:n\/a|0|409|429|500|502|503|504),|\(HTTP (?:409|429|500|502|503|504)\)|^Se interrumpió la conexión/.test(
        message,
      ))
  )
}

async function processReadyItem(
  item: OutboxItem,
  hasLock: boolean,
): Promise<boolean> {
  // Un envío puede coincidir con el arranque diferido de su manejador.
  if (!handlers.has(item.type)) return false
  if (item.state === 'error' && !isRecoverableLegacyError(item)) return false
  if (
    !hasLock &&
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
  const items = await db.outbox
    .where('state')
    .anyOf('pending', 'sending')
    .toArray()
  return items.filter((item) => item.userId === userId).length
}

/** Elementos que requieren revisión o provienen de un error guardado anteriormente. */
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
    const userId = sendingUser()
    if (!userId || !item || item.userId !== userId) return
    await db.outbox.update(id, {
      state: 'pending',
      attempts: 0,
      lastError: null,
      lastErrorCode: null,
      lastServerState: null,
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
    const userId = sendingUser()
    if (!userId || !item || item.userId !== userId) return
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
      lastServerState: null,
      sendingAt: null,
    })
  })
}

/** Descarta un elemento con error y limpia sus datos locales asociados. */
export async function discardOutboxItem(id: string): Promise<void> {
  await exclusive(async () => {
    const item = await db.outbox.get(id)
    const userId = sendingUser()
    if (!userId || !item || item.userId !== userId) return
    await discarders.get(item.type)?.(item.payload)
    await db.outbox.delete(id)
  })
}

async function processItem(item: OutboxItem): Promise<boolean> {
  const handler = handlers.get(item.type)
  if (!handler) return false
  await db.outbox.update(item.id, {
    state: 'sending',
    sendingAt: Date.now(),
  })
  if (sendingUser() !== item.userId) {
    await db.outbox.update(item.id, { state: 'pending', sendingAt: null })
    return false
  }
  try {
    await handler(item.payload)
    return true
  } catch (error) {
    const attempts = item.attempts + 1
    const permanent = !isRetryableOutboxError(error)
    await db.outbox.update(item.id, {
      state: permanent ? 'error' : 'pending',
      attempts,
      sendingAt: null,
      lastError: error instanceof Error ? error.message : String(error),
      lastErrorCode:
        error instanceof OutboxError
          ? error.code
          : permanent
            ? 'sync_failed'
            : null,
      lastServerState: error instanceof OutboxError ? error.serverState : null,
    })
    return false
  }
}
