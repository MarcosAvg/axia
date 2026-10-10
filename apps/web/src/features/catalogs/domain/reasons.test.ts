import { childReasons, indentReasons } from './reasons'
import type { ReasonOption } from './types'

const reasons: ReasonOption[] = [
  { id: 'r1', name: 'Falta de material', use: 'pause', parentId: null },
  { id: 'r2', name: 'Sin stock', use: 'pause', parentId: 'r1' },
  { id: 'r3', name: 'Proveedor', use: 'pause', parentId: 'r2' },
  { id: 'r4', name: 'Espera', use: 'pause', parentId: null },
]

describe('indentReasons', () => {
  it('indenta según la profundidad', () => {
    const choices = indentReasons(reasons)
    expect(choices.map((c) => c.depth)).toEqual([0, 1, 2, 0])
    expect(choices[1]?.label).toBe('— Sin stock')
    expect(choices[2]?.label).toBe('— — Proveedor')
  })
})

describe('childReasons', () => {
  it('devuelve solo los hijos directos', () => {
    expect(childReasons(reasons, 'r1').map((r) => r.id)).toEqual(['r2'])
    expect(childReasons(reasons, null).map((r) => r.id)).toEqual(['r1', 'r4'])
    expect(childReasons(reasons, 'r3')).toEqual([])
  })
})
