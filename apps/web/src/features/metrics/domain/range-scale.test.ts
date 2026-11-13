import { describe, expect, it } from 'vitest'
import { niceTimeScale } from './range-scale'

describe('niceTimeScale', () => {
  it('redondea por encima del P90 más alto con un paso de una hora', () => {
    expect(niceTimeScale(240)).toEqual({
      max: 300,
      step: 60,
      ticks: [0, 60, 120, 180, 240, 300],
    })
  })

  it('elige un paso de media hora para valores intermedios', () => {
    expect(niceTimeScale(100)).toEqual({
      max: 120,
      step: 30,
      ticks: [0, 30, 60, 90, 120],
    })
  })

  it('usa cuartos de hora en muestras cortas', () => {
    expect(niceTimeScale(45)).toEqual({
      max: 60,
      step: 15,
      ticks: [0, 15, 30, 45, 60],
    })
  })

  it('mantiene la escala en horas para un día', () => {
    expect(niceTimeScale(1440)).toEqual({
      max: 1800,
      step: 360,
      ticks: [0, 360, 720, 1080, 1440, 1800],
    })
  })

  it('usa una escala mínima cuando no hay duración', () => {
    expect(niceTimeScale(0)).toEqual({ max: 1, step: 1, ticks: [0, 1] })
  })

  it('deja siempre el máximo por encima del valor y los ticks coherentes', () => {
    for (const value of [1, 7, 59, 61, 333, 2879, 1_000_000]) {
      const scale = niceTimeScale(value)
      expect(scale.max).toBeGreaterThan(value)
      expect(scale.max % scale.step).toBe(0)
      expect(scale.ticks[0]).toBe(0)
      expect(scale.ticks.at(-1)).toBe(scale.max)
      expect(scale.ticks).toHaveLength(scale.max / scale.step + 1)
    }
  })
})
