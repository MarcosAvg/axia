import 'fake-indexeddb/auto'
import { db } from './db'
import { enqueue, processOutbox, registerOutboxHandler } from './outbox'

describe('cola de salida (outbox)', () => {
  beforeEach(async () => {
    await db.outbox.clear()
  })

  afterAll(() => {
    db.close()
  })

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

  it('reintenta un ítem que falla y lleva el conteo', async () => {
    registerOutboxHandler('test_fail', async () => {
      throw new Error('fallo de prueba')
    })
    await enqueue('test_fail', {})

    await processOutbox()

    const items = await db.outbox.toArray()
    expect(items).toHaveLength(1)
    expect(items[0]?.state).toBe('pending')
    expect(items[0]?.attempts).toBe(1)
    expect(items[0]?.lastError).toBe('fallo de prueba')
  })
})
