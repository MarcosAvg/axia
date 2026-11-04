import 'fake-indexeddb/auto'
import { QueryClient, useQuery } from '@tanstack/react-query'
import {
  PersistQueryClientProvider,
  type PersistQueryClientProviderProps,
} from '@tanstack/react-query-persist-client'
import { render, screen, waitFor } from '@testing-library/react'

import { db } from '@/lib/offline/db'
import { setOfflineUserId } from '@/lib/offline/user'
import {
  clearPersistedQueries,
  queryPersister,
  shouldPersistQuery,
} from './query-persister'
import {
  OFFLINE_CACHE_TTL_MS,
  QUERY_CACHE_BUSTER,
} from '@/lib/offline/cache-policy'

function persistOptions(): PersistQueryClientProviderProps['persistOptions'] {
  return {
    persister: queryPersister,
    maxAge: OFFLINE_CACHE_TTL_MS,
    buster: QUERY_CACHE_BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
      shouldDehydrateMutation: () => false,
    },
  }
}

function Ticket({ offline = false }: { offline?: boolean }) {
  const query = useQuery({
    queryKey: ['tickets', 'detail', 't1'],
    queryFn: () =>
      offline
        ? Promise.reject(new Error('sin conexión'))
        : Promise.resolve({ description: 'Fuga guardada' }),
    retry: false,
    staleTime: Infinity,
  })
  return <p>{query.data?.description ?? 'sin datos'}</p>
}

beforeEach(async () => {
  window.localStorage.clear()
  setOfflineUserId('user-a')
  await db.queryCache.clear()
})

afterAll(() => {
  setOfflineUserId(null)
  db.close()
})

describe('PersistQueryClientProvider', () => {
  it('restaura una consulta persistida en un cliente nuevo', async () => {
    const first = new QueryClient()
    const { unmount } = render(
      <PersistQueryClientProvider
        client={first}
        persistOptions={persistOptions()}
      >
        <Ticket />
      </PersistQueryClientProvider>,
    )

    expect(await screen.findByText('Fuga guardada')).toBeVisible()
    await waitFor(async () => {
      expect(await queryPersister.restoreClient()).toBeDefined()
    })
    unmount()

    const second = new QueryClient()
    render(
      <PersistQueryClientProvider
        client={second}
        persistOptions={persistOptions()}
      >
        <Ticket offline />
      </PersistQueryClientProvider>,
    )

    expect(await screen.findByText('Fuga guardada')).toBeVisible()
    await clearPersistedQueries()
  })
})
