import { afterEach } from 'vitest'
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  setDisplayTimezone,
} from './format'

afterEach(() => {
  setDisplayTimezone(undefined)
})

describe('formatDateTime', () => {
  it('aplica la zona horaria de la institución', () => {
    const iso = '2026-10-08T18:00:00Z'
    setDisplayTimezone('UTC')
    const utc = formatDateTime(iso)
    setDisplayTimezone('America/Mexico_City')
    const mexico = formatDateTime(iso)
    expect(utc).not.toBe(mexico)
  })
})

describe('formatDuration', () => {
  it('muestra minutos y horas', () => {
    expect(formatDuration('2026-10-08T10:00:00Z', '2026-10-08T10:30:00Z')).toBe(
      '30 min',
    )
    expect(formatDuration('2026-10-08T10:00:00Z', '2026-10-08T12:15:00Z')).toBe(
      '2 h 15 min',
    )
    expect(formatDuration('2026-10-08T10:00:00Z', null)).toBe('')
  })
})

describe('formatBytes', () => {
  it('usa unidades legibles', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(null)).toBe('')
  })
})
