import { compareValues, nextSort, sortRows } from './sort'

describe('nextSort', () => {
  it('empieza ascendente en una columna nueva', () => {
    expect(nextSort(null, 'name')).toEqual({ key: 'name', dir: 'asc' })
    expect(nextSort({ key: 'name', dir: 'asc' }, 'team')).toEqual({
      key: 'team',
      dir: 'asc',
    })
  })

  it('invierte la dirección al repetir la columna', () => {
    expect(nextSort({ key: 'name', dir: 'asc' }, 'name')).toEqual({
      key: 'name',
      dir: 'desc',
    })
  })
})

describe('compareValues', () => {
  it('compara números y texto de forma natural', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues('Zona 2', 'Zona 10')).toBeLessThan(0)
  })

  it('deja los vacíos al final', () => {
    expect(compareValues(null, 'a')).toBeGreaterThan(0)
    expect(compareValues('a', null)).toBeLessThan(0)
    expect(compareValues(null, '')).toBe(0)
  })
})

describe('sortRows', () => {
  const rows = [
    { name: 'Zona 10', position: 2 },
    { name: 'Zona 2', position: null },
    { name: 'zona 1', position: 1 },
  ]

  it('ordena por texto de forma natural', () => {
    expect(
      sortRows(rows, { key: 'name', dir: 'asc' }).map((r) => r.name),
    ).toEqual(['zona 1', 'Zona 2', 'Zona 10'])
  })

  it('ordena números descendente y deja los vacíos al final', () => {
    expect(
      sortRows(rows, { key: 'position', dir: 'desc' }).map((r) => r.position),
    ).toEqual([2, 1, null])
  })

  it('sin orden devuelve la misma lista', () => {
    expect(sortRows(rows, null)).toBe(rows)
  })

  it('ordena con un valor derivado (por ejemplo, la etiqueta de una relación)', () => {
    const labels = new Map([
      ['t2', 'Seguridad'],
      ['t1', 'Mantenimiento'],
    ])
    const withTeam = [
      { id: 'a', team_id: 't2' },
      { id: 'b', team_id: 't1' },
    ]
    expect(
      sortRows(withTeam, { key: 'team_id', dir: 'asc' }, (row, key) =>
        labels.get(String(row[key as 'team_id'])),
      ).map((row) => row.id),
    ).toEqual(['b', 'a'])
  })
})
