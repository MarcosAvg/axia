import 'fake-indexeddb/auto'
import { QueryObserver } from '@tanstack/react-query'
import { db } from '@/lib/offline/db'
import {
  enqueue,
  processOutbox,
  registerOutboxHandler,
} from '@/lib/offline/outbox'
import { setOfflineUserId } from '@/lib/offline/user'
import { setupOffline } from './offline'
import { queryClient } from './query-client'

afterAll(() => db.close())

it.each([false, true])(
  'retira la acción confirmada con otra consulta lenta (también en cola: %s)',
  async (queueBoth) => {
    const unrelated = new QueryObserver(queryClient, {
      queryKey: ['tickets', 'detail', 'ticket-b'],
      queryFn: ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason))
        }),
      initialData: {},
      staleTime: Infinity,
    })
    const unsubscribe = unrelated.subscribe(() => {})
    setOfflineUserId('user-a')
    registerOutboxHandler('test_action', async () => {})
    await enqueue('test_action', {}, 'ticket-a')
    if (queueBoth) await enqueue('test_action', {}, 'ticket-b')
    const stop = setupOffline()

    try {
      await vi.waitFor(async () => {
        expect(await db.outbox.toArray()).toMatchObject(
          queueBoth ? [{ orderingKey: 'ticket-b', state: 'confirmed' }] : [],
        )
      })
      expect(unrelated.getCurrentResult().fetchStatus).toBe('fetching')
    } finally {
      stop()
      unsubscribe()
      queryClient.clear()
      await processOutbox()
      setOfflineUserId(null)
    }
  },
)

it.each(['detail', 'my-work'])(
  'reintenta la lectura de %s sin volver a enviar la acción',
  async (queryType) => {
    const ticket = { id: 'ticket-a', status: 'assigned' }
    const updated = { ...ticket, status: 'in_progress' }
    const isDetail = queryType === 'detail'
    const refresh = vi
      .fn<() => Promise<object>>()
      .mockRejectedValue(new Error('Sin respuesta'))
    const observer = new QueryObserver(queryClient, {
      queryKey: ['tickets', queryType, isDetail ? 'ticket-a' : 'user-a'],
      queryFn: refresh,
      initialData: isDetail ? ticket : [ticket],
      staleTime: Infinity,
      retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    const send = vi.fn(async () => {})
    setOfflineUserId('user-a')
    registerOutboxHandler('test_action', send)
    await enqueue('test_action', {}, 'ticket-a')
    const stop = setupOffline()

    try {
      await vi.waitFor(() =>
        expect(observer.getCurrentResult().isError).toBe(true),
      )
      expect(await db.outbox.toArray()).toMatchObject([{ state: 'confirmed' }])

      refresh.mockResolvedValue(isDetail ? updated : [updated])
      await processOutbox()
      expect(observer.getCurrentResult().data).toEqual(
        isDetail ? updated : [updated],
      )
      expect(send).toHaveBeenCalledOnce()
      expect(await db.outbox.count()).toBe(0)
    } finally {
      stop()
      unsubscribe()
      queryClient.clear()
      setOfflineUserId(null)
    }
  },
)
