import { CATALOG_IMPORT_SPECS, prepareRow, specByKey } from './catalog-import'
import type { CatalogKey } from './catalog-import'
import { toExportRows, toReferences } from './catalog-export'

type Rows = Record<CatalogKey, Record<string, unknown>[]>

function rows(
  partial: Partial<Record<CatalogKey, Record<string, unknown>[]>>,
): Rows {
  const base = Object.fromEntries(
    CATALOG_IMPORT_SPECS.map((spec) => [spec.key, []]),
  ) as unknown as Rows
  return { ...base, ...partial }
}

function first<T>(items: T[]): T {
  const item = items[0]
  if (!item) throw new Error('Se esperaba al menos una fila')
  return item
}

const categoryRows = rows({
  teams: [{ id: 'team-1', name: 'Mantenimiento' }],
  categories: [{ id: 'cat-1', name: 'Eléctrico' }],
  subcategories: [{ id: 'sub-1', category_id: 'cat-1', name: 'Luminarias' }],
  problems: [
    {
      id: 'prob-1',
      subcategory_id: 'sub-1',
      team_id: 'team-1',
      name: 'Falla',
      active: true,
    },
  ],
})

const reasonRow = {
  id: 'rea-2',
  use: 'pause',
  parent_id: 'rea-1',
  name: 'Sin stock',
  position: 2,
  requires_note: true,
  allows_estimated_date: false,
  clock_class: 'counted',
  active: true,
}

const reasonRows = rows({
  reasons: [
    { id: 'rea-1', use: 'pause', name: 'Falta de material' },
    reasonRow,
  ],
})

describe('toReferences', () => {
  it('compone los ancestros para desambiguar la clasificación', () => {
    const references = toReferences(categoryRows)

    expect(references.subcategories[0]?.parentId).toBe('cat-1')
    expect(references.subcategories[0]?.ancestors).toEqual(['Eléctrico'])
    expect(references.problems[0]?.ancestors).toEqual([
      'Eléctrico',
      'Luminarias',
    ])
  })
})

describe('toExportRows', () => {
  it('convierte ids en etiquetas y booleanos en Sí/No', () => {
    const exported = first(
      toExportRows(
        specByKey('categories'),
        [{ id: 'cat-1', name: 'Eléctrico', active: true }],
        toReferences(categoryRows),
      ),
    )

    expect(exported).toEqual({
      Categoría: 'Eléctrico',
      Activo: 'Sí',
    })
  })

  it('exporta cada nivel en su columna y lo reimporta', () => {
    const references = toReferences(categoryRows)
    const spec = specByKey('subcategories')
    const exported = first(
      toExportRows(
        spec,
        [
          {
            id: 'sub-1',
            category_id: 'cat-1',
            name: 'Luminarias',
            active: false,
          },
        ],
        references,
      ),
    )

    expect(exported).toEqual({
      Categoría: 'Eléctrico',
      Subcategoría: 'Luminarias',
      Activo: 'No',
    })
    const prepared = prepareRow(spec, exported, 2, references)
    expect(prepared.issues).toEqual([])
    expect(prepared.data).toEqual({
      category_id: 'cat-1',
      name: 'Luminarias',
      active: false,
    })
  })
})

describe('problemas', () => {
  it('exporta la clasificación y el equipo del problema', () => {
    const references = toReferences(categoryRows)
    const spec = specByKey('problems')
    const exported = first(
      toExportRows(spec, categoryRows.problems ?? [], references),
    )

    expect(exported).toEqual({
      Categoría: 'Eléctrico',
      Subcategoría: 'Luminarias',
      Problema: 'Falla',
      Equipo: 'Mantenimiento',
      'Prioridad por defecto': null,
      Activo: 'Sí',
    })
    const prepared = prepareRow(spec, exported, 2, references)
    expect(prepared.issues).toEqual([])
    expect(prepared.data.subcategory_id).toBe('sub-1')
    expect(prepared.data.team_id).toBe('team-1')
  })
})

describe('motivos', () => {
  it('exporta uso y padre con etiquetas y los reimporta', () => {
    const references = toReferences(reasonRows)
    const spec = specByKey('reasons')
    const exported = first(toExportRows(spec, [reasonRow], references))

    expect(exported).toEqual({
      Uso: 'Pausa',
      'Motivo padre': 'Falta de material',
      Nombre: 'Sin stock',
      Orden: 2,
      'Exige nota': 'Sí',
      'Admite fecha estimada': 'No',
      'Clasificación de reloj': 'Cuenta',
      Activo: 'Sí',
    })
    const prepared = prepareRow(spec, exported, 2, references)
    expect(prepared.issues).toEqual([])
    expect(prepared.data.parent_id).toBe('rea-1')
  })
})
