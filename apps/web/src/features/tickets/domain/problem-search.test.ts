import { describe, expect, it } from 'vitest'
import { searchProblems } from './problem-search'

const problems = [
  { id: '1', name: 'Lámpara apagada' },
  { id: '2', name: 'Fuga de agua' },
  { id: '3', name: 'Cambio de lámpara' },
]

describe('búsqueda aproximada de problemas', () => {
  it.each([
    'LAMPARA',
    'lámpar',
    'lamapra',
    'lampara apagda',
    'apagada lampara',
  ])('encuentra el problema con «%s»', (query) => {
    expect(searchProblems(problems, query).map(({ id }) => id)).toContain('1')
  })

  it('ordena coincidencias exactas antes que parciales y aproximadas', () => {
    const items = [
      { name: 'Lamparo' },
      { name: 'Cambio de lámpara' },
      { name: 'Lámpara' },
    ]
    expect(searchProblems(items, 'lampara').map(({ name }) => name)).toEqual([
      'Lámpara',
      'Cambio de lámpara',
      'Lamparo',
    ])
  })

  it.each(['', '   ', '!!!', 'computadora', 'fuga electricidad', 'xy'])(
    'no sugiere coincidencias sin relación con «%s»',
    (query) => {
      expect(searchProblems(problems, query)).toEqual([])
    },
  )

  it('tolera dos errores en palabras largas', () => {
    expect(
      searchProblems([{ name: 'Computadora descompuesta' }], 'comptadra'),
    ).toHaveLength(1)
  })

  it('limita las sugerencias sin modificar el catálogo original', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      name: `Fuga ${index}`,
    }))
    expect(searchProblems(items, 'fuga')).toHaveLength(10)
    expect(items).toHaveLength(25)
  })
})
