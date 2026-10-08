import {
  isValidInterval,
  shortTime,
  sortHolidays,
  sortIntervals,
} from './calendar'
import type { CalendarHoliday, CalendarInterval } from './calendar'

describe('shortTime', () => {
  it('recorta un `time` de Postgres a HH:MM', () => {
    expect(shortTime('09:30:00')).toBe('09:30')
    expect(shortTime('18:00')).toBe('18:00')
  })
})

describe('isValidInterval', () => {
  it('exige que el fin sea posterior al inicio', () => {
    expect(isValidInterval('09:00', '18:00')).toBe(true)
    expect(isValidInterval('18:00', '09:00')).toBe(false)
    expect(isValidInterval('09:00', '09:00')).toBe(false)
    expect(isValidInterval('', '18:00')).toBe(false)
  })
})

describe('sortIntervals', () => {
  it('ordena por día y hora de inicio', () => {
    const intervals: CalendarInterval[] = [
      { id: 'b', weekday: 2, startTime: '15:00', endTime: '18:00' },
      { id: 'a', weekday: 1, startTime: '09:00', endTime: '14:00' },
      { id: 'c', weekday: 1, startTime: '15:00', endTime: '18:00' },
    ]
    expect(sortIntervals(intervals).map((item) => item.id)).toEqual([
      'a',
      'c',
      'b',
    ])
  })
})

describe('sortHolidays', () => {
  it('ordena por fecha', () => {
    const holidays: CalendarHoliday[] = [
      { id: 'b', holiday: '2027-01-01', name: null },
      { id: 'a', holiday: '2026-12-25', name: 'Navidad' },
    ]
    expect(sortHolidays(holidays).map((item) => item.id)).toEqual(['a', 'b'])
  })
})
