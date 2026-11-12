import { describe, expect, it } from 'vitest'
import { measureSample, measureValue, totalInMode } from './time-mode'

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
  avgTotalClosed: 100,
  avgTotalClosedLabor: 70,
  sumTotalClosed: 1000,
  sumTotalClosedLabor: 700,
}

const robust = {
  statTotal: 210,
  nTotal: 4,
  statActive: 55,
  nActive: 3,
  statDormant: 5,
  nDormant: 1,
  statResolution: 200,
  nResolution: 2,
}

describe('medida de tiempo', () => {
  it('usa los valores continuos en el modo calendario', () => {
    expect(measureValue(row, 'active', 'calendar', 'average')).toBe(40)
    expect(measureValue(row, 'active', 'calendar', 'total')).toBe(400)
  })

  it('usa los valores laborales en el modo laboral', () => {
    expect(measureValue(row, 'active', 'laboral', 'average')).toBe(30)
    expect(measureValue(row, 'active', 'laboral', 'total')).toBe(300)
  })

  it('usa los valores extra y cae al total continuo', () => {
    expect(measureValue(row, 'active', 'extra', 'average')).toBe(10)
    expect(measureValue(row, 'active', 'extra', 'total')).toBe(100)
    expect(measureValue(row, 'total', 'extra', 'average')).toBe(60)
    expect(measureValue(row, 'total', 'extra', 'total')).toBe(600)
  })

  it('solo muestra la fase dormant en el reloj continuo', () => {
    expect(measureValue(row, 'dormant', 'calendar', 'average')).toBe(5)
    expect(measureValue(row, 'dormant', 'laboral', 'average')).toBe(0)
    expect(measureValue(row, 'dormant', 'extra', 'average')).toBe(0)
  })

  it('mapea la resolución a las columnas de tiquets cerrados', () => {
    expect(measureValue(row, 'resolution', 'calendar', 'average')).toBe(100)
    expect(measureValue(row, 'resolution', 'laboral', 'average')).toBe(70)
    expect(measureValue(row, 'resolution', 'extra', 'average')).toBe(30)
    expect(measureValue(row, 'resolution', 'extra', 'total')).toBe(300)
  })

  it('devuelve cero cuando la fase no existe en el modo', () => {
    expect(measureValue({}, 'pause', 'laboral', 'average')).toBe(0)
  })
})

describe('medidas robustas', () => {
  it('lee las medidas robustas y su muestra', () => {
    expect(measureValue(robust, 'active', 'calendar', 'median')).toBe(55)
    expect(measureValue(robust, 'total', 'extra', 'p90')).toBe(210)
    expect(measureValue(robust, 'resolution', 'laboral', 'max')).toBe(200)
    expect(measureSample(robust, 'active', 'median', 'calendar')).toBe(3)
    expect(measureSample(robust, 'resolution', 'p90', 'calendar')).toBe(2)
  })

  it('no oculta dormant fuera del reloj continuo', () => {
    expect(measureValue(robust, 'dormant', 'laboral', 'median')).toBe(0)
    expect(measureSample(robust, 'dormant', 'median', 'laboral')).toBe(0)
  })

  it('normaliza las claves con guion bajo de las fases', () => {
    expect(
      measureValue(
        { avgPendingTake: 12 },
        'pending_take',
        'calendar',
        'average',
      ),
    ).toBe(12)
    expect(
      measureValue(
        { statPendingTake: 7 },
        'pending_take',
        'calendar',
        'median',
      ),
    ).toBe(7)
  })

  it('no hay muestra para las medidas de media o suma', () => {
    expect(measureSample(row, 'active', 'average', 'calendar')).toBeNull()
    expect(measureSample(row, 'active', 'total', 'calendar')).toBeNull()
  })
})

describe('totalInMode', () => {
  it('elige el total continuo, laboral o extra', () => {
    expect(totalInMode(100, 60, 'calendar')).toBe(100)
    expect(totalInMode(100, 60, 'laboral')).toBe(60)
    expect(totalInMode(100, 60, 'extra')).toBe(40)
  })

  it('nunca devuelve un extra negativo', () => {
    expect(totalInMode(50, 60, 'extra')).toBe(0)
  })
})
