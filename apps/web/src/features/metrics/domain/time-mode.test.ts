import { describe, expect, it } from 'vitest'
import { modeValue } from './time-mode'

const row = {
  avgTotal: 100,
  sumTotal: 1000,
  avgTotalExtra: 60,
  sumTotalExtra: 600,
  avgActive: 40,
  avgActiveLabor: 30,
  avgActiveExtra: 10,
  sumActive: 400,
  sumActiveLabor: 300,
  sumActiveExtra: 100,
  avgDormant: 5,
}

describe('modo de tiempo', () => {
  it('usa los valores continuos en el modo calendario', () => {
    expect(modeValue(row, 'active', 'calendar', 'average')).toBe(40)
    expect(modeValue(row, 'active', 'calendar', 'total')).toBe(400)
  })

  it('usa los valores laborales en el modo laboral', () => {
    expect(modeValue(row, 'active', 'laboral', 'average')).toBe(30)
    expect(modeValue(row, 'active', 'laboral', 'total')).toBe(300)
  })

  it('usa los valores extra y cae al total continuo', () => {
    expect(modeValue(row, 'active', 'extra', 'average')).toBe(10)
    expect(modeValue(row, 'active', 'extra', 'total')).toBe(100)
    expect(modeValue(row, 'total', 'extra', 'average')).toBe(60)
    expect(modeValue(row, 'total', 'extra', 'total')).toBe(600)
  })

  it('solo muestra la fase dormant en el reloj continuo', () => {
    expect(modeValue(row, 'dormant', 'calendar', 'average')).toBe(5)
    expect(modeValue(row, 'dormant', 'laboral', 'average')).toBe(0)
    expect(modeValue(row, 'dormant', 'extra', 'average')).toBe(0)
  })

  it('devuelve cero cuando la fase no existe en el modo', () => {
    expect(modeValue({}, 'pause', 'laboral', 'average')).toBe(0)
  })
})
