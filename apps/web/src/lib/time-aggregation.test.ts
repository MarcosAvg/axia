import {
  aggregationHint,
  aggregationLabel,
  isTimeAggregation,
  resolveTimeAggregation,
  timeValue,
} from './time-aggregation'

describe('time-aggregation', () => {
  it('reconoce solo los valores válidos', () => {
    expect(isTimeAggregation('average')).toBe(true)
    expect(isTimeAggregation('total')).toBe(true)
    expect(isTimeAggregation('otro')).toBe(false)
    expect(resolveTimeAggregation('total')).toBe('total')
    expect(resolveTimeAggregation('otro')).toBe('average')
    expect(resolveTimeAggregation(null)).toBe('average')
  })

  it('etiqueta el modo acumulado', () => {
    expect(aggregationLabel('Trabajo activo', 'average')).toBe('Trabajo activo')
    expect(aggregationLabel('Trabajo activo', 'total')).toBe(
      'Trabajo activo (acumulado)',
    )
  })

  it('explica el modo en el texto de ayuda', () => {
    expect(aggregationHint('Base.', 'average')).toContain('Promedio')
    expect(aggregationHint('Base.', 'total')).toContain('Suma')
  })

  it('elige entre promedio y acumulado', () => {
    expect(timeValue('average', 90, 180)).toBe(90)
    expect(timeValue('total', 90, 180)).toBe(180)
  })
})
