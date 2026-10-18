import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from './metrics'
import { isQuickRangeActive, rangeForDays } from './period'

const now = new Date('2026-10-18T12:00:00Z')

describe('isQuickRangeActive', () => {
  it('marca Todo cuando no hay fechas', () => {
    expect(isQuickRangeActive(EMPTY_FILTERS, null, now)).toBe(true)
    expect(
      isQuickRangeActive(
        { ...EMPTY_FILTERS, from: '2026-10-01', to: '2026-10-18' },
        null,
        now,
      ),
    ).toBe(false)
  })

  it('marca el rango rápido que coincide con las fechas', () => {
    const range = rangeForDays(7, now)
    expect(isQuickRangeActive({ ...EMPTY_FILTERS, ...range }, 7, now)).toBe(
      true,
    )
    expect(isQuickRangeActive({ ...EMPTY_FILTERS, ...range }, 30, now)).toBe(
      false,
    )
  })
})
