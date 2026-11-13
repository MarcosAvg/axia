import { describe, expect, it } from 'vitest'

import {
  dimensionTicketFilters,
  metricsBaseFilters,
  phaseTicketFilters,
} from './drill-down'

describe('drill-down filters', () => {
  it('maps each hierarchical dimension to its ticket filter', () => {
    expect(dimensionTicketFilters('category', 'cat')).toEqual({
      categoryId: 'cat',
    })
    expect(dimensionTicketFilters('subcategory', 'sub')).toEqual({
      subcategoryId: 'sub',
    })
    expect(dimensionTicketFilters('problem', 'prob')).toEqual({
      problemId: 'prob',
    })
    expect(dimensionTicketFilters('location', 'loc')).toEqual({
      locationId: 'loc',
    })
    expect(dimensionTicketFilters('service_type', 'st')).toEqual({
      serviceTypeId: 'st',
    })
  })

  it('maps outcome and status dimensions to their filters', () => {
    expect(dimensionTicketFilters('outcome', 'closed')).toEqual({
      outcome: 'closed',
    })
    expect(dimensionTicketFilters('status', 'paused')).toEqual({
      status: 'paused',
    })
  })

  it('keeps the metric period and clock in the base filters', () => {
    expect(
      metricsBaseFilters({
        from: '2026-01-01',
        to: '2026-01-31',
        buildingId: 'bld',
        teamId: '',
        categoryId: 'cat',
        dependencyId: '',
        outcome: 'open',
        clock: 'laboral',
      }),
    ).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      buildingId: 'bld',
      categoryId: 'cat',
      outcome: 'open',
      slaClock: 'laboral',
    })
  })

  it('maps a phase and its clock mode', () => {
    expect(phaseTicketFilters('active', 'laboral')).toEqual({
      phase: 'active',
      timeMode: 'laboral',
    })
    expect(phaseTicketFilters('total', 'calendar')).toEqual({
      phase: 'total',
      timeMode: 'calendar',
    })
    expect(phaseTicketFilters('total', 'extra')).toBeNull()
  })
})
