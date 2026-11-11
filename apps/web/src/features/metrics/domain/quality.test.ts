import { describe, expect, it } from 'vitest'
import type { DimensionRow } from './dimensions'
import { activeMinutesInMode, riskAverage, riskRate } from './quality'

const row = {
  reopenRate: 0.2,
  recaptureRate: 0.1,
  reassignmentRate: 0.3,
  avgActive: 100,
  avgActiveLabor: 60,
} as unknown as DimensionRow

describe('riskRate', () => {
  it('elige la tasa de riesgo pedida', () => {
    expect(riskRate(row, 'reopen')).toBe(0.2)
    expect(riskRate(row, 'recapture')).toBe(0.1)
    expect(riskRate(row, 'reassignment')).toBe(0.3)
  })
})

describe('activeMinutesInMode', () => {
  it('aplica el reloj al tiempo activo', () => {
    expect(activeMinutesInMode(row, 'calendar')).toBe(100)
    expect(activeMinutesInMode(row, 'laboral')).toBe(60)
    expect(activeMinutesInMode(row, 'extra')).toBe(40)
  })
})

describe('riskAverage', () => {
  const rows = [
    {
      tickets: 10,
      reopened: 2,
      closedOrReopened: 8,
      recaptured: 1,
      reassigned: 3,
    },
    {
      tickets: 20,
      reopened: 3,
      closedOrReopened: 12,
      recaptured: 2,
      reassigned: 6,
    },
  ] as unknown as DimensionRow[]

  it('calcula la tasa global con el denominador de cada señal', () => {
    expect(riskAverage(rows, 'reopen')).toBeCloseTo(0.25)
    expect(riskAverage(rows, 'recapture')).toBeCloseTo(0.1)
    expect(riskAverage(rows, 'reassignment')).toBeCloseTo(0.3)
  })

  it('devuelve cero sin denominador', () => {
    expect(riskAverage([], 'reopen')).toBe(0)
  })
})
