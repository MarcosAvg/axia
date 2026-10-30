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
    adminReplaceDependencyLocations: vi.fn(async () => undefined),
  }
})

vi.mock('./admin-api', () => ({
  adminList: mocks.adminList,
  adminInsert: mocks.adminInsert,
  adminUpdate: mocks.adminUpdate,
  adminReplaceDependencyLocations: mocks.adminReplaceDependencyLocations,
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

  it('reemplaza los vínculos dependencia–ubicación', async () => {
    mocks.store.dependencies = [{ id: 'dep-1', name: 'Sistemas' }]
    mocks.store.buildings = [{ id: 'bld-1', name: 'Edificio Central' }]
    mocks.store.locations = [
      { id: 'loc-1', name: 'Piso 1', building_id: 'bld-1' },
      { id: 'loc-2', name: 'Piso 2', building_id: 'bld-1' },
    ]
    const result = await importCatalogSheets({}, [
      {
        dependency: 'Sistemas',
        building: 'Edificio Central',
        location: 'Piso 1',
      },
      {
        dependency: 'Sistemas',
        building: 'Edificio Central',
        location: 'Piso 2',
      },
    ])

    expect(mocks.adminReplaceDependencyLocations).toHaveBeenCalledWith(
      'dep-1',
      ['loc-1', 'loc-2'],
    )
    expect(result.report.at(-1)).toMatchObject({
      updated: 1,
      invalid: 0,
      errors: 0,
    })
  })
})
