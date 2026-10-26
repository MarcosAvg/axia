import {
  EMPTY_FILTERS,
  averageOf,
  formatMinutes,
  formatPercent,
  formatScore,
  intervalToMinutes,
  toCsv,
} from './metrics'
import {
  deltaOf,
  formatDelta,
  formatMonthLabel,
  formatRangeLabel,
  previousRange,
  rangeForDays,
} from './period'

describe('intervalToMinutes', () => {
  it('lee tiempos y días', () => {
    expect(intervalToMinutes('04:05:00')).toBe(245)
    expect(intervalToMinutes('1 day 02:00:00')).toBe(1560)
    expect(intervalToMinutes(null)).toBe(0)
    expect(intervalToMinutes('-00:30:00')).toBe(-30)
  })
})

describe('formatMinutes y formatPercent', () => {
  it('formatea duraciones y porcentajes', () => {
    expect(formatMinutes(0)).toBe('0 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h')
    expect(formatMinutes(135)).toBe('2 h 15 min')
    expect(formatPercent(0.25)).toBe('25%')
  })
})

describe('toCsv', () => {
  it('escapa comas y comillas', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['x,y', 'z"w'],
        [1, 2],
      ],
    )
    expect(csv).toBe('a,b\n"x,y","z""w"\n1,2')
  })
})

describe('averageOf', () => {
  it('promedia y tolera listas vacías', () => {
    expect(averageOf([10, 20, 30])).toBe(20)
    expect(averageOf([])).toBe(0)
  })
})

describe('formatScore', () => {
  it('formatea la satisfacción promedio', () => {
    expect(formatScore(4.25)).toBe('4.3 / 5')
    expect(formatScore(null)).toBe('—')
  })
})

describe('rangeForDays', () => {
  it('devuelve el rango de los últimos N días, terminando hoy', () => {
    const now = new Date(2026, 9, 15)
    expect(rangeForDays(7, now)).toEqual({
      from: '2026-10-09',
      to: '2026-10-15',
    })
  })
})

describe('previousRange', () => {
  it('desplaza el rango por su longitud', () => {
    expect(
      previousRange({ ...EMPTY_FILTERS, from: '2026-10-08', to: '2026-10-15' }),
    ).toEqual({ ...EMPTY_FILTERS, from: '2026-09-30', to: '2026-10-07' })
  })

  it('devuelve null sin rango completo', () => {
    expect(previousRange(EMPTY_FILTERS)).toBeNull()
    expect(previousRange({ ...EMPTY_FILTERS, from: '2026-10-08' })).toBeNull()
  })
})

describe('deltaOf y formatDelta', () => {
  it('calcula el cambio relativo', () => {
    expect(deltaOf(120, 100)).toBeCloseTo(0.2)
    expect(deltaOf(80, 100)).toBeCloseTo(-0.2)
    expect(deltaOf(10, 0)).toBeNull()
  })

  it('formatea con signo', () => {
    expect(formatDelta(0.2)).toBe('+20%')
    expect(formatDelta(-0.2)).toBe('-20%')
    expect(formatDelta(0)).toBe('0%')
    expect(formatDelta(null)).toBe('—')
  })
})

describe('formatRangeLabel', () => {
  it('formatea un rango con meses en español', () => {
    expect(formatRangeLabel('2026-09-30', '2026-10-07')).toBe('30 sep – 7 oct')
    expect(formatRangeLabel('', '')).toBe('')
  })
})

describe('formatMonthLabel', () => {
  it('formatea un mes con año', () => {
    expect(formatMonthLabel('2026-10')).toBe('oct 2026')
    expect(formatMonthLabel('2026-01')).toBe('ene 2026')
  })
})
