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
    adminSaveDependency: vi.fn(async () => 'dep-1'),
  }
})

vi.mock('./admin-api', () => ({
  adminList: mocks.adminList,
  adminInsert: mocks.adminInsert,
  adminUpdate: mocks.adminUpdate,
  adminSaveDependency: mocks.adminSaveDependency,
}))

import { importCatalogSheets } from './catalog-transfer-api'

beforeEach(() => {
  mocks.reset()
  vi.clearAllMocks()
})

describe('catálogos', () => {
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

describe('dependencias', () => {
  it('agrupa una dependencia con varias ubicaciones', async () => {
    mocks.store.dependencies = [{ id: 'dep-1', name: 'Sistemas' }]
    mocks.store.buildings = [{ id: 'bld-1', name: 'Edificio Central' }]
    mocks.store.locations = [
      { id: 'loc-1', name: 'Piso 1', building_id: 'bld-1' },
      { id: 'loc-2', name: 'Piso 2', building_id: 'bld-1' },
    ]
    const result = await importCatalogSheets({}, [
      {
        name: 'Sistemas',
        active: 'Sí',
        building: 'Edificio Central',
        location: 'Piso 1',
      },
      {
        name: 'Sistemas',
        active: 'Sí',
        building: 'Edificio Central',
        location: 'Piso 2',
      },
    ])

    expect(mocks.adminSaveDependency).toHaveBeenCalledWith(
      {
        name: 'Sistemas',
        active: true,
        locationIds: ['loc-1', 'loc-2'],
      },
      'dep-1',
    )
    expect(result.report[0]).toMatchObject({
      updated: 1,
      invalid: 0,
      errors: 0,
    })
  })

  it('rechaza una dependencia sin ubicación', async () => {
    mocks.store.buildings = [{ id: 'bld-1', name: 'Edificio Central' }]
    const result = await importCatalogSheets({}, [
      {
        name: 'Sistemas',
        active: 'Sí',
        building: 'Edificio Central',
        location: '',
      },
    ])

    expect(mocks.adminSaveDependency).not.toHaveBeenCalled()
    expect(result.report[0]).toMatchObject({ invalid: 1, inserted: 0 })
  })
})
