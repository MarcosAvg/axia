import { describe, expect, it } from 'vitest'

import { toCycleTimes } from '../../src/tickets/detail-times.js'

describe('tiempos por fase del detalle', () => {
  it('conserva los minutos laborales devueltos por la consulta', () => {
    expect(
      toCycleTimes(
        {
          total_minutes_labor: '66',
          response_minutes_labor: '1',
          assignment_minutes_labor: '2',
          pending_take_minutes_labor: '3',
          reassignment_minutes_labor: '4',
          wait_minutes_labor: '5',
          active_minutes_labor: '6',
          pause_minutes_labor: '7',
          dormant_minutes_labor: '8',
          validation_minutes_labor: '9',
          claim_minutes_labor: '10',
        },
        'laboral',
      ),
    ).toEqual({
      total: 66,
      response: 1,
      assignment: 2,
      pendingTake: 3,
      reassignment: 4,
      wait: 5,
      active: 6,
      pause: 7,
      dormant: 8,
      validation: 9,
      claim: 10,
    })
  })

  it('conserva los modos continuo y extra', () => {
    const row = { active_minutes: '30', active_minutes_extra: '12' }
    expect(toCycleTimes(row).active).toBe(30)
    expect(toCycleTimes(row, 'extra').active).toBe(12)
    expect(toCycleTimes(row).pause).toBe(0)
  })
})
