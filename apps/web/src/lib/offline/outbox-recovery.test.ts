import 'fake-indexeddb/auto'
import { db } from './db'
import { enqueue, processOutbox, registerOutboxHandler } from './outbox'
import { setOfflineUserId } from './user'

beforeEach(async () => {
  await db.outbox.clear()
  setOfflineUserId('user-a')
})

afterAll(() => {
  db.close()
  setOfflineUserId(null)
})

it('conserva los reintentos de transporte hasta que vuelva a responder el servidor', async () => {
  const handler = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  registerOutboxHandler('prolonged_network', handler)
  await enqueue('prolonged_network', {})
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await processOutbox()
  }
  expect((await db.outbox.toArray())[0]?.state).toBe('pending')

  registerOutboxHandler('prolonged_network', async () => {})
  await processOutbox()
  expect(await db.outbox.count()).toBe(0)
})

it('recoge una acción encolada mientras termina el envío anterior', async () => {
  let finishFirst!: () => void
  const first = new Promise<void>((resolve) => {
    finishFirst = resolve
  })
  const handled = vi.fn(async (payload: unknown) => {
    if (payload === 'primera') await first
  })
  registerOutboxHandler('append_during_send', handled)
  await enqueue('append_during_send', 'primera', 'ticket-a')
  const running = processOutbox()
  await vi.waitFor(() => expect(handled).toHaveBeenCalledWith('primera'))
  await enqueue('append_during_send', 'segunda', 'ticket-a')
  const next = processOutbox()
  finishFirst()
  await Promise.all([running, next])
  expect(handled.mock.calls).toEqual([['primera'], ['segunda']])
  expect(await db.outbox.count()).toBe(0)
})

it('retoma un envío reciente al recuperar el bloqueo de una pestaña cerrada', async () => {
  const handled = vi.fn(async () => {})
  registerOutboxHandler('abandoned', handled)
  await enqueue('abandoned', {}, 'ticket-a')
  const [item] = await db.outbox.toArray()
  await db.outbox.update(item!.id, { state: 'sending', sendingAt: Date.now() })
  const request = vi.fn(async (_name: string, task: () => Promise<void>) =>
    task(),
  )
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request },
  })
  try {
    await processOutbox()
    expect(request).toHaveBeenCalledTimes(1)
    expect(handled).toHaveBeenCalledTimes(1)
    expect(await db.outbox.count()).toBe(0)
  } finally {
    Reflect.deleteProperty(navigator, 'locks')
  }
})

it('recupera un conflicto TUS anterior sin descartar las acciones del tiquet', async () => {
  const upload = vi.fn(async () => {})
  const action = vi.fn(async () => {})
  registerOutboxHandler('evidence_upload', upload)
  registerOutboxHandler('after_legacy_evidence', action)
  await enqueue('evidence_upload', {}, 'ticket-a')
  await enqueue('after_legacy_evidence', {}, 'ticket-a')
  const failed = await db.outbox.where('type').equals('evidence_upload').first()
  await db.outbox.update(failed!.id, {
    state: 'error',
    lastError: 'No se pudo subir la evidencia (HTTP 409)',
  })
  await processOutbox()
  expect(upload).toHaveBeenCalledBefore(action)
  expect(await db.outbox.count()).toBe(0)
})
