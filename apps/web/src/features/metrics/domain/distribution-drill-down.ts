import type { TicketListFilters } from '@/features/tickets'
import { phaseTicketFilters } from './drill-down'
import type { DistributionProfileRow } from './metrics'
import type { TimeMode } from './time-mode'

export const DISTRIBUTION_COLUMNS = [
  'median',
  'iqr',
  'p90',
  'max',
  'outliers',
  'mean',
] as const

export type DistributionColumn = (typeof DISTRIBUTION_COLUMNS)[number]

export interface DistributionDrillDownFilters {
  primary: TicketListFilters
  alternate: TicketListFilters
}

/** Filtros del subconjunto que representa cada valor de la tabla y su complemento. */
export function distributionDrillDownFilters(
  row: DistributionProfileRow,
  mode: TimeMode,
  column: DistributionColumn,
): DistributionDrillDownFilters | null {
  const base = phaseTicketFilters(row.phase, mode)
  if (!base) return null

  if (column === 'median') {
    return {
      primary: { ...base, phaseMinutesMax: row.median },
      alternate: { ...base, phaseMinutesAbove: row.median },
    }
  }
  if (column === 'iqr') {
    return {
      primary: {
        ...base,
        phaseMinutesMin: row.p25,
        phaseMinutesMax: row.p75,
      },
      alternate: {
        ...base,
        phaseOutsideLow: row.p25,
        phaseOutsideHigh: row.p75,
      },
    }
  }
  if (column === 'p90') {
    return {
      primary: { ...base, phaseMinutesMax: row.p90 },
      alternate: { ...base, phaseMinutesAbove: row.p90 },
    }
  }
  if (column === 'max') {
    return {
      primary: { ...base, phaseMinutesMin: row.max },
      alternate: { ...base, phaseMinutesBelow: row.max },
    }
  }
  if (column === 'outliers') {
    return {
      primary: {
        ...base,
        phaseOutsideLow: row.lowerFence,
        phaseOutsideHigh: row.upperFence,
      },
      alternate: {
        ...base,
        phaseMinutesMin: Math.max(0, row.lowerFence),
        phaseMinutesMax: row.upperFence,
      },
    }
  }
  return {
    primary: { ...base, phaseMinutesMax: row.mean },
    alternate: { ...base, phaseMinutesAbove: row.mean },
  }
}
