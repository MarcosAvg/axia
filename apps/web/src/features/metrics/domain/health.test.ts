import { describe, expect, it } from 'vitest'
import type { DimensionGroup, DimensionRow } from './dimensions'
import { healthSnapshot } from './health'

function status(id: string, tickets: number): DimensionGroup {
  return { dimension: 'status', row: { id, tickets } as DimensionRow }
}

const groups = [
  status('registered', 2),
  status('with_supervisor', 1),
  status('paused', 3),
  status('closed', 7),
]

describe('healthSnapshot', () => {
  it('deriva los indicadores del resumen y de los estados', () => {
    expect(
      healthSnapshot({
        summary: {
          tickets: 20,
          open: 10,
          closed: 7,
          firstTimeFixRate: 0.6,
        },
        groups,
        sla: { complianceRate: 0.8 },
        satisfaction: { average: 4.2 },
      }),
    ).toEqual({
      tickets: 20,
      active: 10,
      unassigned: 3,
      paused: 3,
      closed: 7,
      sla: 0.8,
      satisfaction: 4.2,
      firstFix: 0.6,
    })
  })

  it('devuelve cero cuando faltan estados', () => {
    const snapshot = healthSnapshot({
      summary: { tickets: 0, open: 0, closed: 0, firstTimeFixRate: 0 },
      groups: [],
      sla: { complianceRate: null },
      satisfaction: { average: null },
    })
    expect(snapshot.unassigned).toBe(0)
    expect(snapshot.paused).toBe(0)
    expect(snapshot.sla).toBeNull()
  })
})
