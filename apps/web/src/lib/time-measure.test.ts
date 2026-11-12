import { describe, expect, it } from 'vitest'
import { resolveTimeMeasure, TIME_MEASURES } from './time-measure'

describe('medida de tiempos', () => {
  it('acepta las medidas conocidas', () => {
    for (const measure of TIME_MEASURES) {
      expect(resolveTimeMeasure(measure)).toBe(measure)
    }
  })

  it('cae en promedio ante un valor desconocido', () => {
    expect(resolveTimeMeasure('p99')).toBe('average')
    expect(resolveTimeMeasure(undefined)).toBe('average')
    expect(resolveTimeMeasure(null)).toBe('average')
  })
})
