import type { AdminCatalogTree } from './catalog-types'
import {
  depthFunction,
  orderTreeRows,
  rowsWithAncestors,
  visibleRows,
} from './catalog-tree'

const tree: AdminCatalogTree = {
  parentKey: 'parent_id',
  orderKey: 'position',
  labelKey: 'name',
}

const rows = [
  { id: 'hija-b', name: 'Compra externa', parent_id: 'raiz-1', position: 2 },
  { id: 'raiz-2', name: 'Acceso al área', parent_id: null, position: 5 },
  { id: 'raiz-1', name: 'Falta de material', parent_id: null, position: 1 },
  { id: 'hija-a', name: 'En cotización', parent_id: 'raiz-1', position: 1 },
  { id: 'nieta', name: 'Compra aprobada', parent_id: 'hija-b', position: 1 },
]

const byId = (id: string) => rows.find((row) => row.id === id)
const valueOf = (row: Record<string, unknown>, key: string): unknown => row[key]

describe('depthFunction', () => {
  it('cuenta los ancestros de cada nodo', () => {
    const depthOf = depthFunction(rows, tree.parentKey)
    expect(depthOf(byId('raiz-1')!)).toBe(0)
    expect(depthOf(byId('hija-a')!)).toBe(1)
    expect(depthOf(byId('nieta')!)).toBe(2)
  })
})

describe('orderTreeRows', () => {
  it('deja cada hijo debajo de su padre y ordena hermanos por posición', () => {
    const ordered = orderTreeRows(rows, tree, { sort: null, valueOf })
    expect(ordered.map((row) => row.id)).toEqual([
      'raiz-1',
      'hija-a',
      'hija-b',
      'nieta',
      'raiz-2',
    ])
  })

  it('ordena hermanos por la columna elegida sin aplastar la jerarquía', () => {
    const ordered = orderTreeRows(rows, tree, {
      sort: { key: 'position', dir: 'desc' },
      valueOf,
    })
    expect(ordered.map((row) => row.id)).toEqual([
      'raiz-2',
      'raiz-1',
      'hija-b',
      'nieta',
      'hija-a',
    ])
  })
})

describe('orderTreeRows con grupo', () => {
  it('agrupa las raíces por la columna indicada', () => {
    const grouped: AdminCatalogTree = { ...tree, groupKey: 'use' }
    const conUso = [
      {
        id: 'rechazo',
        name: 'Rechazo A',
        parent_id: null,
        position: 1,
        use: 'rejection',
      },
      {
        id: 'pausa',
        name: 'Pausa A',
        parent_id: null,
        position: 9,
        use: 'pause',
      },
      {
        id: 'pausa-hija',
        name: 'Pausa hija',
        parent_id: 'pausa',
        position: 1,
        use: 'pause',
      },
    ]
    const rank = (row: Record<string, unknown>) => (row.use === 'pause' ? 0 : 1)
    const ordered = orderTreeRows(conUso, grouped, {
      sort: null,
      valueOf,
      groupRank: rank,
    })
    expect(ordered.map((row) => row.id)).toEqual([
      'pausa',
      'pausa-hija',
      'rechazo',
    ])
  })

  it('no pierde filas con padre ausente o ciclos', () => {
    const parcial = [
      { id: 'suelta', name: 'Suelta', parent_id: 'inexistente', position: 0 },
      { id: 'a', name: 'A', parent_id: 'b', position: 0 },
      { id: 'b', name: 'B', parent_id: 'a', position: 0 },
    ]
    const ordered = orderTreeRows(parcial, tree, { sort: null, valueOf })
    expect(ordered.map((row) => row.id).sort()).toEqual(['a', 'b', 'suelta'])
  })
})

describe('rowsWithAncestors', () => {
  it('conserva a los antecesores de las coincidencias', () => {
    const filtered = rowsWithAncestors(rows, tree, (row) => row.id === 'nieta')
    expect(filtered.map((row) => row.id).sort()).toEqual([
      'hija-b',
      'nieta',
      'raiz-1',
    ])
  })

  it('sin coincidencias no devuelve filas', () => {
    expect(rowsWithAncestors(rows, tree, () => false)).toHaveLength(0)
  })
})

describe('visibleRows', () => {
  it('oculta a los descendientes de un nodo contraído', () => {
    const visible = visibleRows(rows, tree.parentKey, new Set(['raiz-1']))
    expect(visible.map((row) => row.id)).toEqual(['raiz-2', 'raiz-1'])
  })

  it('sin contraídos devuelve todas las filas', () => {
    expect(visibleRows(rows, tree.parentKey, new Set())).toHaveLength(
      rows.length,
    )
  })
})
