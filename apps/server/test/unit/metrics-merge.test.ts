import { describe, expect, it } from 'vitest'
import { mergeBy } from '../../src/metrics/merge-impl.js'

describe('mergeBy', () => {
  it('normaliza los conteos de una fila que no se repite', () => {
    const rows = mergeBy(
      [{ reason: 'Fuera de alcance', tickets: '2', total_time: '01:30:00' }],
      (row: Record<string, unknown>) => String(row.reason),
      ['tickets'],
      ['total_time'],
    )
    expect(rows[0]?.tickets).toBe(2)
    expect(rows[0]?.total_time).toBe('01:30:00')
  })

  it('suma conteos e intervalos al agrupar', () => {
    const rows = mergeBy(
      [
        { reason: 'A', tickets: '2', total_time: '01:00:00' },
        { reason: 'A', tickets: '3', total_time: '00:30:00' },
      ],
      (row: Record<string, unknown>) => String(row.reason),
      ['tickets'],
      ['total_time'],
    )
    expect(rows).toEqual([{ reason: 'A', tickets: 5, total_time: '01:30:00' }])
  })
})
