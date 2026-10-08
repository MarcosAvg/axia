import 'fake-indexeddb/auto'
import { db } from './db'

function outboxItem() {
  return {
    id: crypto.randomUUID(),
    type: 'ticket-start',
    payload: { ticketId: 'ticket-1' },
    state: 'pending' as const,
    attempts: 0,
    createdAt: Date.now(),
  }
}

describe('base local (Dexie)', () => {
  beforeEach(async () => {
    await db.outbox.clear()
    await db.evidences.clear()
  })

  afterAll(() => {
    db.close()
  })

  it('guarda y lee un elemento de la cola de salida', async () => {
    const item = outboxItem()
    await db.outbox.add(item)

    const stored = await db.outbox.get(item.id)
    expect(stored).toMatchObject({
      id: item.id,
      type: 'ticket-start',
      state: 'pending',
      attempts: 0,
    })
  })

  it('lista los elementos pendientes ordenados por creación', async () => {
    const first = { ...outboxItem(), createdAt: 1000 }
    const second = { ...outboxItem(), createdAt: 2000 }
    await db.outbox.bulkAdd([second, first])

    const pending = await db.outbox
      .where('state')
      .equals('pending')
      .sortBy('createdAt')

    expect(pending.map((item) => item.id)).toEqual([first.id, second.id])
  })

  it('guarda y lee una evidencia', async () => {
    const id = crypto.randomUUID()
    // Nota: fake-indexeddb no conserva el contenido de un Blob al leerlo (lo
    // devuelve como objeto vacío); en un navegador real IndexedDB sí guarda el
    // Blob. Aquí solo se verifica que el registro sobrevive la ronda.
    const blob = new Blob(['foto'], { type: 'image/jpeg' })
    await db.evidences.add({
      id,
      ticketId: 'ticket-1',
      blob,
      state: 'pending',
      createdAt: Date.now(),
    })

    const stored = await db.evidences.get(id)
    expect(stored?.id).toBe(id)
    expect(stored?.ticketId).toBe('ticket-1')
    expect(stored?.state).toBe('pending')
  })
})
