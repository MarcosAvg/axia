import { duplicateRateByDimension } from './duplicates'
import type { DuplicateDimensionRow } from './metrics'

function row(partial: Partial<DuplicateDimensionRow>): DuplicateDimensionRow {
  return {
    dimension: 'team',
    dimensionId: 't1',
    dimensionName: null,
    tickets: 0,
    duplicates: 0,
    duplicateRate: 0,
    ...partial,
  }
}

describe('duplicateRateByDimension', () => {
  it('agrega por dimensión y ordena por tasa', () => {
    const result = duplicateRateByDimension([
      row({ dimension: 'team', dimensionId: 't1', tickets: 10, duplicates: 1 }),
      row({ dimension: 'team', dimensionId: 't2', tickets: 10, duplicates: 3 }),
      row({
        dimension: 'building',
        dimensionId: 'b1',
        tickets: 20,
        duplicates: 1,
      }),
    ])
    expect(result[0]).toMatchObject({
      dimension: 'team',
      tickets: 20,
      duplicates: 4,
      rate: 0.2,
    })
    expect(result[1]).toMatchObject({
      dimension: 'building',
      tickets: 20,
      duplicates: 1,
      rate: 0.05,
    })
  })

  it('tolera listas vacías', () => {
    expect(duplicateRateByDimension([])).toEqual([])
  })
})
