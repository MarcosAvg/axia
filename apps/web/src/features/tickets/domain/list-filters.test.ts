import { describe, expect, it } from 'vitest'

import {
  hasInheritedTicketFilters,
  withoutInheritedTicketFilters,
} from './list-filters'

describe('filtros heredados de métricas', () => {
  it('detecta los filtros que no tienen control en la lista', () => {
    expect(hasInheritedTicketFilters({ page: 1 })).toBe(false)
    expect(hasInheritedTicketFilters({ page: 1, problemId: 'problem-1' })).toBe(
      true,
    )
    expect(
      hasInheritedTicketFilters({ page: 1, pauseReasonId: 'reason-1' }),
    ).toBe(true)
    expect(hasInheritedTicketFilters({ page: 1, phaseMinutesMin: 5 })).toBe(
      true,
    )
    expect(
      hasInheritedTicketFilters({
        page: 1,
        phaseOutsideLow: 0,
        phaseOutsideHigh: 10,
      }),
    ).toBe(true)
    expect(hasInheritedTicketFilters({ page: 1, phaseMinutesAbove: 5 })).toBe(
      true,
    )
    expect(hasInheritedTicketFilters({ page: 1, phaseMinutesBelow: 5 })).toBe(
      true,
    )
  })

  it('no avisa por el reloj del SLA si no hay filtro de SLA', () => {
    expect(hasInheritedTicketFilters({ page: 1, slaClock: 'laboral' })).toBe(
      false,
    )
    expect(
      hasInheritedTicketFilters({ page: 1, sla: 'met', slaClock: 'laboral' }),
    ).toBe(true)
  })

  it('los quita sin borrar los filtros visibles', () => {
    expect(
      withoutInheritedTicketFilters({
        page: 2,
        buildingId: 'building-1',
        problemId: 'problem-1',
        statuses: ['registered', 'with_supervisor'],
        sla: 'met',
        phaseMinutesMin: 5,
        phaseMinutesAbove: 5,
        phaseMinutesBelow: 5,
        phaseOutsideLow: 0,
        phaseOutsideHigh: 10,
      }),
    ).toEqual({ page: 2, buildingId: 'building-1' })
  })
})
