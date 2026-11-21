import {
  OFFLINE_CACHE_TTL_MS,
  QUERY_CACHE_BUSTER,
} from '@/lib/offline/cache-policy'
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'
import { isRetryableOutboxError } from '@/lib/offline/errors'
import { db } from '@/lib/offline/db'
import { currentOfflineUserId, offlineUserForTab } from '@/lib/offline/user'

const QUERY_CACHE_KEY = 'query-cache'
const QUERY_CACHE_OWNER_KEY = 'axia.offline.queryCacheUser'

function setOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(QUERY_CACHE_OWNER_KEY, userId)
    else localStorage.removeItem(QUERY_CACHE_OWNER_KEY)
  } catch {
    // Sin almacenamiento no hay caché persistida que aislar.
  }
}

/** Dueño del caché persistido, para no mostrar datos de otra sesión. */
export function queryCacheOwner(): string | null {
  try {
    return localStorage.getItem(QUERY_CACHE_OWNER_KEY) || null
  } catch {
    return null
  }
}

/** Persiste el caché de React Query en Dexie; nunca cachea mutaciones. */
export const queryPersister: Persister = {
  persistClient: async (client) => {
    const owner = offlineUserForTab()
    if (!owner || owner !== currentOfflineUserId()) return
    const previousOwner = queryCacheOwner()
    if (previousOwner && previousOwner !== owner) return

    await db.queryCache.put({
      key: QUERY_CACHE_KEY,
      owner,
      value: normalizeClient(client),
    })
    if (owner === offlineUserForTab() && owner === currentOfflineUserId())
      setOwner(owner)
  },
  restoreClient: async () => {
    if (!queryCacheOwner()) {
      await db.queryCache.delete(QUERY_CACHE_KEY)
      return undefined
    }
    const row = await db.queryCache.get(QUERY_CACHE_KEY)
    if (row?.owner !== undefined && row.owner !== queryCacheOwner())
      return undefined
    return row?.value as PersistedClient | undefined
  },
  removeClient: async () => {
    await db.queryCache.delete(QUERY_CACHE_KEY)
    setOwner(null)
  },
}

function normalizeClient(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((query) =>
    query.state.status === 'error'
      ? {
          ...query,
          state: { ...query.state, status: 'success' as const, error: null },
        }
      : query,
  )
  return { ...client, clientState: { ...client.clientState, queries } }
}

/**
 * Solo se guardan datos que permiten continuar trabajo: tiquets, catálogos e
 * identidad. Notificaciones, métricas, administración y URLs de evidencia se
 * quedan fuera.
 */
function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  const [root, sub] = queryKey
  if (root === 'tickets' || root === 'catalogs') return true
  return root === 'auth' && sub === 'identity'
}

/** Además de la clave, la consulta debe haber terminado bien para ser serializable. */
export function shouldPersistQuery(query: {
  queryKey: readonly unknown[]
  state: { status: string; data?: unknown; error?: unknown }
}): boolean {
  const { status, data, error } = query.state
  if (!shouldPersistQueryKey(query.queryKey)) return false
  return status === 'success' || (data != null && isRetryableOutboxError(error))
}

export async function clearPersistedQueries(): Promise<void> {
  await db.queryCache.clear()
  setOwner(null)
}

async function readQueryCacheForUser(userId: string) {
  const row = await db.queryCache.get(QUERY_CACHE_KEY)
  if (!row) return undefined
  const owner = row.owner === undefined ? queryCacheOwner() : row.owner
  return owner === userId ? (row.value as PersistedClient) : undefined
}

export async function readyTicketDetails(
  userId: string,
  now = Date.now(),
  requiredKeys: (readonly unknown[])[] = [],
) {
  const ready = new Map<string, number>()
  const client = await readQueryCacheForUser(userId)
  if (
    !client ||
    client.buster !== QUERY_CACHE_BUSTER ||
    now - client.timestamp > OFFLINE_CACHE_TTL_MS
  )
    return ready

  const saved = client.clientState.queries
  if (!hasRequiredQueries(saved, requiredKeys, now)) return ready

  for (const query of saved) {
    const id = readyTicketId(query, now)
    if (id !== undefined) ready.set(id, query.state.dataUpdatedAt)
  }
  return ready
}

function hasRequiredQueries(
  saved: PersistedClient['clientState']['queries'],
  requiredKeys: (readonly unknown[])[],
  now: number,
): boolean {
  const validKeys = new Set(
    saved
      .filter(
        ({ state }) =>
          state.status === 'success' &&
          state.data != null &&
          now - state.dataUpdatedAt <= OFFLINE_CACHE_TTL_MS,
      )
      .map(({ queryKey }) => JSON.stringify(queryKey)),
  )
  return requiredKeys.every((key) => validKeys.has(JSON.stringify(key)))
}

function readyTicketId(
  { queryKey, state }: PersistedClient['clientState']['queries'][number],
  now: number,
): string | undefined {
  const [root, section, id] = queryKey
  if (root !== 'tickets' || section !== 'detail' || typeof id !== 'string')
    return
  if (state.status !== 'success' || !state.data) return
  if (now - state.dataUpdatedAt <= OFFLINE_CACHE_TTL_MS) return id
}
