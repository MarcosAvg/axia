import { cn } from 'cn'
import type { DistributionColumn } from '../domain/distribution-drill-down'
import { distributionDrillDownFilters } from '../domain/distribution-drill-down'
import { formatMinutes } from '../domain/metrics'
import type { DistributionProfileRow } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { MetricCount } from './metric-count'

type Variant = 'primary' | 'alternate'

const t = metricsMessages.times

function minutesSuffix(
  row: DistributionProfileRow,
  column: 'median' | 'p90' | 'mean',
  variant: Variant,
): string {
  const value =
    column === 'median' ? row.median : column === 'p90' ? row.p90 : row.mean
  return variant === 'primary'
    ? `≤ ${formatMinutes(value)}`
    : `> ${formatMinutes(value)}`
}

function iqrSuffix(row: DistributionProfileRow, variant: Variant): string {
  return variant === 'primary'
    ? `${formatMinutes(row.p25)}–${formatMinutes(row.p75)}`
    : `< ${formatMinutes(row.p25)} o > ${formatMinutes(row.p75)}`
}

function maxSuffix(row: DistributionProfileRow, variant: Variant): string {
  return variant === 'primary'
    ? formatMinutes(row.max)
    : `< ${formatMinutes(row.max)}`
}

function outliersSuffix(row: DistributionProfileRow, variant: Variant): string {
  return variant === 'primary'
    ? `${row.outliers} de ${row.n}`
    : `${formatMinutes(Math.max(0, row.lowerFence))}–${formatMinutes(
        row.upperFence,
      )}`
}

function suffix(
  row: DistributionProfileRow,
  column: DistributionColumn,
  variant: Variant,
): string {
  if (column === 'median' || column === 'p90' || column === 'mean') {
    return minutesSuffix(row, column, variant)
  }
  if (column === 'iqr') return iqrSuffix(row, variant)
  if (column === 'max') return maxSuffix(row, variant)
  return outliersSuffix(row, variant)
}

function title(
  row: DistributionProfileRow,
  column: DistributionColumn,
  phaseLabel: string,
  variant: Variant,
): string {
  const label = t.valueDrillDown[column][variant]
  return `${metricsMessages.drillDown.label} · ${phaseLabel} · ${label} (${suffix(
    row,
    column,
    variant,
  )})`
}

/** Valor de la tabla que abre su subconjunto de tiquets y el complemento. */
export function DistributionValueCell({
  row,
  mode,
  column,
  phaseLabel,
  enough,
  alwaysShow = false,
  muted = false,
  children,
}: {
  row: DistributionProfileRow
  mode: TimeMode
  column: DistributionColumn
  phaseLabel: string
  enough: boolean
  alwaysShow?: boolean
  muted?: boolean
  children: string
}) {
  if (!enough && !alwaysShow) {
    return (
      <span title={t.insufficientSample} className="text-muted-foreground">
        —
      </span>
    )
  }
  const content = (
    <span className={cn('tabular-nums', muted && 'text-muted-foreground')}>
      {children}
    </span>
  )
  const filters = enough
    ? distributionDrillDownFilters(row, mode, column)
    : null
  if (!filters) return content
  return (
    <MetricCount
      title={title(row, column, phaseLabel, 'primary')}
      filters={filters.primary}
      alternate={{
        title: title(row, column, phaseLabel, 'alternate'),
        filters: filters.alternate,
      }}
    >
      {content}
    </MetricCount>
  )
}
