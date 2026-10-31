import { describe, expect, it } from 'vitest'
import {
  intervalMinutes,
  minutesToInterval,
  number,
} from '../../src/metrics/format.js'

describe('formato HTTP de métricas', () => {
  it('normaliza conteos SQL y valores nulos', () => {
    expect(number('2')).toBe(2)
    expect(number(null)).toBe(0)
  })

  it('conserva intervalos en minutos con días y horas acumuladas', () => {
    expect(minutesToInterval(intervalMinutes('2 days 01:30:00'))).toBe(
      '49:30:00',
    )
    expect(minutesToInterval(intervalMinutes(null))).toBe('00:00:00')
  })
})
