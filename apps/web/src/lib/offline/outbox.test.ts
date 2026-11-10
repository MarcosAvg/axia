import 'fake-indexeddb/auto'
import { db } from './db'
import {
  discardOutboxItem,
  enqueue,
  errorsForCurrentUser,
  processOutbox,
  registerOutboxHandler,
  retryOutboxItem,
  retryOutboxItemWithManualTime,
} from './outbox'
import { setOfflineUserId } from './user'

beforeEach(async () => {
  await db.outbox.clear()
  setOfflineUserId('user-a')
})

afterAll(() => {
  db.close()
  setOfflineUserId(null)
})

describe('procesamiento de la cola', () => {
  it('procesa y elimina un ítem correcto', async () => {
    let handled = 0
    registerOutboxHandler('test_ok', async () => {
      handled += 1
    })
    await enqueue('test_ok', { value: 1 })

    await processOutbox()

    expect(handled).toBe(1)
    expect(await db.outbox.count()).toBe(0)
  })

  it('reintenta un ítem que falla por red', async () => {
    registerOutboxHandler('test_fail', async () => {
      throw new TypeError('Failed to fetch')
    })
    await enqueue('test_fail', {})

    await processOutbox()

    const items = await db.outbox.toArray()
    expect(items).toHaveLength(1)
    expect(items[0]?.state).toBe('pending')
    expect(items[0]?.attempts).toBe(1)
  })

  it('no reintenta un error de dominio', async () => {
    let calls = 0
    registerOutboxHandler('test_domain', async () => {
      calls += 1
      throw new Error('El tiquet ya cambió')
    })
    await enqueue('test_domain', {})

    await processOutbox()
    await processOutbox()

    const items = await db.outbox.toArray()
    expect(calls).toBe(1)
    expect(items).toHaveLength(1)
    expect(items[0]?.state).toBe('error')
    expect(items[0]?.attempts).toBe(1)
    expect(items[0]?.lastError).toBe('El tiquet ya cambió')
  })
})

describe('errores definitivos', () => {
  it('lista, reintenta y descarta los errores del usuario actual', async () => {
    registerOutboxHandler('test_retry', async () => {
      throw new Error('fallo definitivo')
    })
    await enqueue('test_retry', {})
    await processOutbox()

    const [failed] = await errorsForCurrentUser()
    expect(failed?.lastError).toBe('fallo definitivo')

    registerOutboxHandler('test_retry', async () => {})
    await retryOutboxItem(failed!.id)
    expect((await db.outbox.get(failed!.id))?.state).toBe('pending')
    await processOutbox()
    expect(await db.outbox.count()).toBe(0)

    const discard = vi.fn(async () => {})
    registerOutboxHandler(
      'test_discard',
      async () => {
        throw new Error('no se puede')
      },
      discard,
    )
    await enqueue('test_discard', { evidenceId: 'local-1' })
    await processOutbox()
    const [toDiscard] = await errorsForCurrentUser()
    await discardOutboxItem(toDiscard!.id)
    expect(discard).toHaveBeenCalledWith({ evidenceId: 'local-1' })
    expect(await db.outbox.count()).toBe(0)
  })

  it('no toca los errores de otra persona', async () => {
    registerOutboxHandler('test_error_owner', async () => {
      throw new Error('ajeno')
    })
    await enqueue('test_error_owner', {})
    await processOutbox()
    const [failed] = await errorsForCurrentUser()

    setOfflineUserId('user-b')
    expect(await errorsForCurrentUser()).toEqual([])
    await retryOutboxItem(failed!.id)
    await discardOutboxItem(failed!.id)
    expect((await db.outbox.get(failed!.id))?.state).toBe('error')
  })
})

describe('propietario de la cola', () => {
  it('no envía si cambia la sesión mientras IndexedDB prepara el envío', async () => {
    const handler = vi.fn(async () => {})
    registerOutboxHandler('session_at_sending', handler)
    await enqueue('session_at_sending', {})
    const update = db.outbox.update.bind(db.outbox)
    const spy = vi
      .spyOn(db.outbox, 'update')
      .mockImplementationOnce((key, changes) =>
        update(key, changes).then((result) => {
          setOfflineUserId('user-b')
          return result
        }),
      )
    try {
      await processOutbox()
      expect(handler).not.toHaveBeenCalled()
      expect((await db.outbox.toArray())[0]).toMatchObject({
        userId: 'user-a',
        state: 'pending',
        attempts: 0,
      })
    } finally {
      spy.mockRestore()
    }
  })

  it('no envía la cola de otra persona', async () => {
    const handled = vi.fn(async () => {})
    registerOutboxHandler('test_owner', handled)
    await enqueue('test_owner', {})

    setOfflineUserId('user-b')
    await processOutbox()

    expect(handled).not.toHaveBeenCalled()
    expect(await db.outbox.count()).toBe(1)

    setOfflineUserId('user-a')
    await processOutbox()

    expect(handled).toHaveBeenCalledTimes(1)
    expect(await db.outbox.count()).toBe(0)
  })
})

describe('dependencias por tiquet', () => {
  it('mantiene el bloqueo tras un error entre procesamientos y deja avanzar otro tiquet', async () => {
    const sent: string[] = []
    registerOutboxHandler('ordered', async (payload) => {
      const name = payload as string
      sent.push(name)
      if (name === 'fallo') throw new Error('Conflicto de estado')
    })
    await enqueue('ordered', 'fallo', 'ticket-a')
    await enqueue('ordered', 'dependiente', 'ticket-a')
    await enqueue('ordered', 'independiente', 'ticket-b')

    await processOutbox()
    await processOutbox()

    expect(sent).toEqual(['fallo', 'independiente'])
    const pending = (await db.outbox.toArray()).find(
      (item) => item.payload === 'dependiente',
    )
    expect(pending).toMatchObject({ state: 'pending', attempts: 0 })
    const [failed] = await errorsForCurrentUser()
    await discardOutboxItem(failed!.id)
    await processOutbox()
    expect(sent).toEqual(['fallo', 'independiente', 'dependiente'])
  })

  it('espera al reintento de red antes de enviar la siguiente acción', async () => {
    let online = false
    const sent: string[] = []
    registerOutboxHandler('ordered_network', async (payload) => {
      if (!online) throw new TypeError('Failed to fetch')
      sent.push(payload as string)
    })
    await enqueue('ordered_network', 'primera', 'ticket-a')
    await enqueue('ordered_network', 'segunda', 'ticket-a')
    await processOutbox()
    expect(
      (await db.outbox.toArray()).map((item) => item.attempts).sort(),
    ).toEqual([0, 1])

    online = true
    await processOutbox()
    expect(sent).toEqual(['primera', 'segunda'])
    expect(await db.outbox.count()).toBe(0)
  })
})

describe('compatibilidad de dependencias', () => {
  it('comprueba la sesión después de resolver una fila antigua', async () => {
    const handler = vi.fn(async () => {})
    registerOutboxHandler('legacy_session', handler, undefined, async () => {
      setOfflineUserId('user-b')
      return 'ticket-a'
    })
    await enqueue('legacy_session', {})
    await processOutbox()
    expect(handler).not.toHaveBeenCalled()
    expect(await db.outbox.count()).toBe(1)
  })

  it('resuelve las dependencias de filas antiguas de distintos manejadores', async () => {
    registerOutboxHandler(
      'legacy_evidence',
      async () => {
        throw new Error('Subida rechazada')
      },
      undefined,
      async () => 'ticket-a',
    )
    const action = vi.fn(async () => {})
    registerOutboxHandler(
      'legacy_action',
      action,
      undefined,
      async () => 'ticket-a',
    )
    await enqueue('legacy_evidence', { evidenceId: 'local' })
    await enqueue('legacy_action', { ticketId: 'ticket-a' })

    await processOutbox()
    await processOutbox()

    expect(action).not.toHaveBeenCalled()
    expect(await db.outbox.count()).toBe(2)
  })
})

describe('recuperación de dependencias', () => {
  it('no adelanta una acción a un envío todavía activo y recupera el envío interrumpido', async () => {
    const sent: string[] = []
    registerOutboxHandler('active_order', async (payload) => {
      sent.push(payload as string)
    })
    await enqueue('active_order', 'primera', 'ticket-a')
    await enqueue('active_order', 'segunda', 'ticket-a')
    const [first] = (await db.outbox.toArray()).sort((a, b) => a.seq - b.seq)
    await db.outbox.update(first!.id, {
      state: 'sending',
      sendingAt: Date.now(),
    })
    await processOutbox()
    expect(sent).toEqual([])

    await db.outbox.update(first!.id, { sendingAt: Date.now() - 60_001 })
    await processOutbox()
    expect(sent).toEqual(['primera', 'segunda'])
  })

  it('reanuda la cadena solo después de reintentar explícitamente el error de dominio', async () => {
    let valid = false
    const sent: string[] = []
    registerOutboxHandler('retry_order', async (payload) => {
      if (!valid) throw new Error('Conflicto')
      sent.push(payload as string)
    })
    await enqueue('retry_order', 'primera', 'ticket-a')
    await enqueue('retry_order', 'segunda', 'ticket-a')
    await processOutbox()
    valid = true
    await processOutbox()
    expect(sent).toEqual([])
    const [failed] = await errorsForCurrentUser()
    await retryOutboxItem(failed!.id)
    await processOutbox()
    expect(sent).toEqual(['primera', 'segunda'])
  })

  it('interrumpe el procesamiento si cambia la sesión durante un envío', async () => {
    const handler = vi.fn(async () => {
      setOfflineUserId('user-b')
    })
    registerOutboxHandler('session_changes', handler)
    await enqueue('session_changes', {})
    await enqueue('session_changes', {})
    await processOutbox()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(await db.outbox.count()).toBe(1)
  })
})

it('corrige la hora de un ítem rechazado y lo devuelve a pendiente', async () => {
  await enqueue(
    'ticket_action',
    {
      ticketId: 't1',
      clientRequestId: '00000000-0000-4000-8000-000000000001',
      clientReportedAt: '2026-11-10T20:00:00.000Z',
    },
    't1',
  )
  const [item] = await db.outbox.toArray()
  if (!item) throw new Error('El ítem no se encoló')

  await retryOutboxItemWithManualTime(item.id, '2026-11-10T14:30')

  expect(await db.outbox.get(item.id)).toMatchObject({
    state: 'pending',
    attempts: 0,
    lastError: null,
    lastErrorCode: null,
    payload: expect.objectContaining({
      occurredLocal: '2026-11-10T14:30',
      manualTime: true,
    }),
  })
})
