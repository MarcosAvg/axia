import { describe, expect, it } from 'vitest'
import type { DimensionRow } from './dimensions'
import { activeMinutesInMode, riskRate } from './quality'

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
