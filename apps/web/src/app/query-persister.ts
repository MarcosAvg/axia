import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'
import { db } from '@/lib/offline/db'
import { currentOfflineUserId } from '@/lib/offline/user'

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
    await db.queryCache.put({ key: QUERY_CACHE_KEY, value: client })
    setOwner(currentOfflineUserId())
  },
  restoreClient: async () => {
    if (!queryCacheOwner()) {
      await db.queryCache.delete(QUERY_CACHE_KEY)
      return undefined
    }
    const row = await db.queryCache.get(QUERY_CACHE_KEY)
    return row?.value as PersistedClient | undefined
  },
  removeClient: async () => {
    await db.queryCache.delete(QUERY_CACHE_KEY)
    setOwner(null)
  },
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
  state: { status: string }
}): boolean {
  return (
    query.state.status === 'success' && shouldPersistQueryKey(query.queryKey)
  )
}

export async function clearPersistedQueries(): Promise<void> {
  await db.queryCache.clear()
  setOwner(null)
}
