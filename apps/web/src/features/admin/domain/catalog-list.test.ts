import { filterCatalogRows, fixedOptionLabel } from './catalog-list'
import type { AdminColumn } from './catalogs'

const columns: AdminColumn[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'team_id', label: 'Equipo', optionsTable: 'teams' },
  { key: 'active', label: 'Activo' },
]

const optionsFor = (table: string) =>
  table === 'teams'
    ? [
        { id: 't1', label: 'Mantenimiento' },
        { id: 't2', label: 'Seguridad' },
      ]
    : []

const rows = [
  { id: 'c1', name: 'Eléctrico', team_id: 't1', active: true },
  { id: 'c2', name: 'Vigilancia', team_id: 't2', active: false },
]

describe('fixedOptionLabel', () => {
  const options = [
    { value: 'cancellation', label: 'Cancelación' },
    { value: 'pause', label: 'Pausa' },
  ]

  it('traduce el valor interno a su etiqueta', () => {
    expect(fixedOptionLabel(options, 'cancellation')).toBe('Cancelación')
  })

  it('conserva el valor si no hay etiqueta', () => {
    expect(fixedOptionLabel(options, 'otro')).toBe('otro')
  })
})

describe('filterCatalogRows', () => {
  it('sin término devuelve todas las filas', () => {
    expect(filterCatalogRows(rows, columns, optionsFor, '  ')).toHaveLength(2)
  })

  it('busca por nombre', () => {
    expect(
      filterCatalogRows(rows, columns, optionsFor, 'vigil').map((r) => r.id),
    ).toEqual(['c2'])
  })

  it('busca por la etiqueta de la relación resuelta', () => {
    expect(
      filterCatalogRows(rows, columns, optionsFor, 'mantenimiento').map(
        (r) => r.id,
      ),
    ).toEqual(['c1'])
  })
})
