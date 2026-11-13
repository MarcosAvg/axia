import { describe, expect, it } from 'vitest'
import {
  DISTRIBUTION_COLUMNS,
  distributionDrillDownFilters,
} from './distribution-drill-down'
import type { DistributionProfileRow } from './metrics'

const row: DistributionProfileRow = {
  phase: 'active',
  n: 10,
  total: 20,
  coverage: 0.5,
  mean: 120,
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

describe('distributionDrillDownFilters', () => {
  it('lists the columns that open a ticket list', () => {
    expect(DISTRIBUTION_COLUMNS).toEqual([
      'median',
      'iqr',
      'p90',
      'max',
      'outliers',
      'mean',
    ])
  })

  it('builds the median subset and its inverse', () => {
    expect(distributionDrillDownFilters(row, 'calendar', 'median')).toEqual({
      primary: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMax: 100,
      },
      alternate: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesAbove: 100,
      },
    })
  })

  it('builds the central IQR subset and its inverse', () => {
    expect(distributionDrillDownFilters(row, 'calendar', 'iqr')).toEqual({
      primary: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMin: 50,
        phaseMinutesMax: 150,
      },
      alternate: {
        phase: 'active',
        timeMode: 'calendar',
        phaseOutsideLow: 50,
        phaseOutsideHigh: 150,
      },
    })
  })

  it('builds the P90 subset and its inverse', () => {
    expect(distributionDrillDownFilters(row, 'calendar', 'p90')).toEqual({
      primary: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMax: 200,
      },
      alternate: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesAbove: 200,
      },
    })
  })
})

describe('distributionDrillDownFilters extremes', () => {
  it('builds the maximum subset and its inverse', () => {
    expect(distributionDrillDownFilters(row, 'calendar', 'max')).toEqual({
      primary: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMin: 300,
      },
      alternate: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesBelow: 300,
      },
    })
  })

  it('builds the outlier subset and its inverse', () => {
    expect(distributionDrillDownFilters(row, 'calendar', 'outliers')).toEqual({
      primary: {
        phase: 'active',
        timeMode: 'calendar',
        phaseOutsideLow: -100,
        phaseOutsideHigh: 300,
      },
      alternate: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMin: 0,
        phaseMinutesMax: 300,
      },
    })
  })

  it('uses the positive lower fence on the inside subset', () => {
    expect(
      distributionDrillDownFilters(
        { ...row, lowerFence: 10 },
        'calendar',
        'outliers',
      )?.alternate,
    ).toEqual({
      phase: 'active',
      timeMode: 'calendar',
      phaseMinutesMin: 10,
      phaseMinutesMax: 300,
    })
  })
})

describe('distributionDrillDownFilters mean and clock', () => {
  it('builds the mean subset and its inverse', () => {
    expect(distributionDrillDownFilters(row, 'calendar', 'mean')).toEqual({
      primary: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMax: 120,
      },
      alternate: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesAbove: 120,
      },
    })
  })

  it('does not offer a list when the clock has no drill-down', () => {
    expect(distributionDrillDownFilters(row, 'extra', 'median')).toBeNull()
  })
})
