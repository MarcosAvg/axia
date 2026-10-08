import {
  amountFor,
  deriveTargetUnit,
  formatTargetMinutes,
  minutesFrom,
} from './target'

describe('deriveTargetUnit', () => {
  it('elige la unidad más legible', () => {
    expect(deriveTargetUnit(4320)).toBe('days')
    expect(deriveTargetUnit(120)).toBe('hours')
    expect(deriveTargetUnit(90)).toBe('minutes')
    expect(deriveTargetUnit(null)).toBe('minutes')
  })
})

describe('amountFor', () => {
  it('convierte minutos a la unidad', () => {
    expect(amountFor(90, 'hours')).toBe('1.5')
    expect(amountFor(4320, 'days')).toBe('3')
    expect(amountFor(null, 'minutes')).toBe('')
  })
})

describe('minutesFrom', () => {
  it('convierte cantidad y unidad a minutos', () => {
    expect(minutesFrom('2', 'hours')).toBe(120)
    expect(minutesFrom('1.5', 'days')).toBe(2160)
    expect(minutesFrom('', 'hours')).toBeNull()
    expect(minutesFrom('0', 'hours')).toBeNull()
  })
})

describe('formatTargetMinutes', () => {
  it('muestra el objetivo de forma legible', () => {
    expect(formatTargetMinutes(60)).toBe('1 h')
    expect(formatTargetMinutes(90)).toBe('1 h 30 min')
    expect(formatTargetMinutes(4320)).toBe('3 d')
    expect(formatTargetMinutes(null)).toBe('—')
  })
})
