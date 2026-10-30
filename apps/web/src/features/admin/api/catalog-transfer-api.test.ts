import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const store: Record<string, Record<string, unknown>[]> = {}
  let next = 0
  return {
    store,
    reset: () => {
      for (const key of Object.keys(store)) delete store[key]
      next = 0
    },
    adminList: vi.fn(async (table: string) => store[table] ?? []),
    adminInsert: vi.fn(
      async (table: string, values: Record<string, unknown>) => {
        next += 1
        const id = `id-${next}`
        ;(store[table] ??= []).push({ id, ...values })
        return id
      },
    ),
    adminUpdate: vi.fn(
      async (table: string, id: string, values: Record<string, unknown>) => {
        const row = store[table]?.find((item) => item.id === id)
        if (row) Object.assign(row, values)
      },
    ),
  }
})

vi.mock('./admin-api', () => ({
  adminList: mocks.adminList,
  adminInsert: mocks.adminInsert,
  adminUpdate: mocks.adminUpdate,
}))

import { importCatalogSheets } from './catalog-transfer-api'

describe('importCatalogSheets', () => {
  beforeEach(() => {
    mocks.reset()
    vi.clearAllMocks()
  })

  it('inserta un motivo hijo después de su padre aunque venga primero', async () => {
    const base = {
      Uso: 'Pausa',
      'Clasificación de reloj': 'Cuenta',
      Activo: 'Sí',
    }
    const result = await importCatalogSheets({
      reasons: [
        { ...base, 'Motivo padre': 'Falta de material', Nombre: 'Sin stock' },
        { ...base, Nombre: 'Falta de material' },
      ],
    })

    expect(result.report[0]).toMatchObject({
      inserted: 2,
      invalid: 0,
      errors: 0,
    })
    expect(result.issues).toEqual([])
    const parent = mocks.store.reasons?.find(
      (row) => row.name === 'Falta de material',
    )
    const child = mocks.store.reasons?.find((row) => row.name === 'Sin stock')
    expect(child?.parent_id).toBe(parent?.id)
  })
})
