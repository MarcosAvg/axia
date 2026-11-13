import { describe, expect, it } from 'vitest'

import {
  PHASE_SUBSETS,
  dimensionTicketFilters,
  metricsBaseFilters,
  phaseSubsetFilters,
  phaseTicketFilters,
} from './drill-down'
import type { DistributionProfileRow } from './metrics'

const row: DistributionProfileRow = {
  phase: 'active',
  n: 10,
  total: 20,
  coverage: 0.5,
  mean: 100,
  median: 100,
  p25: 50,
  p75: 150,
  p90: 200,
  p95: 220,
  max: 300,
  lowerFence: -100,
  upperFence: 300,
  outliers: 2,
  outlierRate: 0.2,
}

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

describe('phase subsets', () => {
  it('lists the available subsets in order', () => {
    expect(PHASE_SUBSETS).toEqual([
      'all',
      'outliers',
      'above_p90',
      'above_p75',
      'central',
      'below_median',
    ])
  })

  it('translates each subset to ticket list filters', () => {
    expect(phaseSubsetFilters(row, 'calendar', 'all')).toEqual({
      phase: 'active',
      timeMode: 'calendar',
    })
    expect(phaseSubsetFilters(row, 'calendar', 'outliers')).toEqual({
      phase: 'active',
      timeMode: 'calendar',
      phaseOutsideLow: -100,
      phaseOutsideHigh: 300,
    })
    expect(phaseSubsetFilters(row, 'calendar', 'above_p90')).toEqual({
      phase: 'active',
      timeMode: 'calendar',
      phaseMinutesMin: 200,
    })
    expect(phaseSubsetFilters(row, 'calendar', 'above_p75')).toEqual({
      phase: 'active',
      timeMode: 'calendar',
      phaseMinutesMin: 150,
    })
    expect(phaseSubsetFilters(row, 'calendar', 'central')).toEqual({
      phase: 'active',
      timeMode: 'calendar',
      phaseMinutesMin: 50,
      phaseMinutesMax: 150,
    })
    expect(phaseSubsetFilters(row, 'calendar', 'below_median')).toEqual({
      phase: 'active',
      timeMode: 'calendar',
      phaseMinutesMax: 100,
    })
  })

  it('does not offer subsets when the clock has no drill-down', () => {
    expect(phaseSubsetFilters(row, 'extra', 'all')).toBeNull()
  })
})
