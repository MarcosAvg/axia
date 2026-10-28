import { describe, expect, it } from 'vitest'
import { cumulativeShare, cyclePhases, rejectReasons, shareOf } from './visuals'

describe('cyclePhases', () => {
  it('separa las fases conocidas y el resto', () => {
    expect(
      cyclePhases({
        response: 5,
        assignment: 5,
        reassignment: 2,
        wait: 3,
        active: 40,
        pause: 10,
        validation: 5,
        claim: 2,
        total: 100,
      }),
    ).toEqual([
      { phase: 'response', minutes: 5 },
      { phase: 'assignment', minutes: 5 },
      { phase: 'reassignment', minutes: 2 },
      { phase: 'wait', minutes: 3 },
      { phase: 'active', minutes: 40 },
      { phase: 'pause', minutes: 10 },
      { phase: 'validation', minutes: 5 },
      { phase: 'claim', minutes: 2 },
      { phase: 'unclassified', minutes: 28 },
    ])
  })

  it('no inventa tiempo negativo si las fases superan el total', () => {
    expect(
      cyclePhases({
        response: 5,
        assignment: 5,
        reassignment: 5,
        wait: 5,
        active: 5,
        pause: 5,
        validation: 5,
        claim: 5,
        total: 5,
      })[8],
    ).toEqual({ phase: 'unclassified', minutes: 0 })
  })
})

describe('cumulativeShare', () => {
  it('acumula proporciones', () => {
    expect(cumulativeShare([1, 1, 2])).toEqual([0.25, 0.5, 1])
  })

  it('devuelve ceros sin datos', () => {
    expect(cumulativeShare([0, 0])).toEqual([0, 0])
    expect(cumulativeShare([])).toEqual([])
  })
})

describe('shareOf', () => {
  it('acota entre 0 y 1', () => {
    expect(shareOf(5, 10)).toBe(0.5)
    expect(shareOf(-1, 10)).toBe(0)
    expect(shareOf(20, 10)).toBe(1)
    expect(shareOf(1, 0)).toBe(0)
  })
})

describe('rejectReasons', () => {
  it('agrupa por motivo, separa tipos y ordena por total', () => {
    expect(
      rejectReasons([
        { eventType: 'rejected', reasonName: 'Sin evidencia', tickets: 2 },
        { eventType: 'cancelled', reasonName: 'Duplicado', tickets: 1 },
        { eventType: 'rejected', reasonName: 'Duplicado', tickets: 3 },
      ]),
    ).toEqual([
      { name: 'Duplicado', rejected: 3, cancelled: 1, total: 4 },
      { name: 'Sin evidencia', rejected: 2, cancelled: 0, total: 2 },
    ])
  })
})
