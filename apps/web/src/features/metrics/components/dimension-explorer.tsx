import { useState } from 'react'
import { BarChart3Icon } from 'lucide-react'
import { BarCell } from './bar-cell'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { HintLabel } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  aggregationHint,
  aggregationLabel,
  timeValue,
} from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { DIMENSIONS } from '../domain/dimensions'
import type {
  Dimension,
  DimensionGroup,
  DimensionRow,
} from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const t = metricsMessages.table
const hints = metricsMessages.tableHints

type DimensionVariant = 'counts' | 'times'

function maxOf(rows: DimensionRow[], pick: (row: DimensionRow) => number) {
  return Math.max(1, ...rows.map(pick))
}

function countColumns(
  nameOf: (id: string) => string,
  maxTickets: number,
): DataTableColumn<DimensionRow>[] {
  return [
    { id: 'name', header: t.name, cell: (row) => nameOf(row.id) },
    {
      id: 'tickets',
      header: t.tickets,
      hint: hints.dimensionTickets,
      cell: (row) => (
        <BarCell
          value={row.tickets}
          max={maxTickets}
          label={row.tickets}
          className="min-w-40"
        />
      ),
    },
    {
      id: 'reassignment',
      header: t.reassignment,
      hint: hints.reassignment,
      hideBelow: 'md',
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'recapture',
      header: t.recapture,
      hint: hints.recapture,
      hideBelow: 'md',
      cell: (row) => formatPercent(row.recaptureRate),
    },
  ]
}

function timeColumns(
  nameOf: (id: string) => string,
  aggregation: TimeAggregation,
  maxActive: number,
): DataTableColumn<DimensionRow>[] {
  return [
    { id: 'name', header: t.name, cell: (row) => nameOf(row.id) },
    {
      id: 'tickets',
      header: t.tickets,
      hint: hints.dimensionTickets,
      hideBelow: 'md',
      cell: (row) => row.tickets,
    },
    {
      id: 'avgActive',
      header: aggregationLabel(t.avgActive, aggregation),
      hint: hints.avgActive,
      cell: (row) => {
        const value = timeValue(aggregation, row.avgActive, row.sumActive)
        return (
          <BarCell
            value={value}
            max={maxActive}
            label={formatMinutes(value)}
            className="min-w-44"
          />
        )
      },
    },
    {
      id: 'avgTotal',
      header: aggregationLabel(t.avgTotal, aggregation),
      hint: hints.avgTotal,
      hideBelow: 'md',
      cell: (row) =>
        formatMinutes(timeValue(aggregation, row.avgTotal, row.sumTotal)),
    },
  ]
}

function rowsFor(groups: DimensionGroup[], dimension: Dimension) {
  return groups
    .filter((group) => group.dimension === dimension)
    .map((group) => group.row)
    .sort((left, right) => right.tickets - left.tickets)
}

function DimensionSelector({
  dimension,
  onChange,
}: {
  dimension: Dimension
  onChange: (dimension: Dimension) => void
}) {
  return (
    <div
      role="group"
      aria-label={metricsMessages.dimensions.viewBy}
      className="flex flex-wrap items-center gap-1"
    >
      <span className="mr-1 text-xs text-muted-foreground">
        {metricsMessages.dimensions.viewBy}
      </span>
      {DIMENSIONS.map((value) => (
        <Button
          key={value}
          type="button"
          variant={value === dimension ? 'secondary' : 'ghost'}
          aria-pressed={value === dimension}
          className="min-h-11 px-2.5 lg:min-h-8"
          onClick={() => onChange(value)}
        >
          {dimensionLabels[value]}
        </Button>
      ))}
    </div>
  )
}

function DimensionBody({
  rows,
  columns,
}: {
  rows: DimensionRow[]
  columns: DataTableColumn<DimensionRow>[]
}) {
  return (
    <CardContent className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {metricsMessages.dimensions.count(rows.length)}
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
      ) : (
        <div className="max-h-80 overflow-auto">
          <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />
        </div>
      )}
    </CardContent>
  )
}

/** Dimensiones en una sola tarjeta: selector y tabla con barras. */
export function DimensionExplorer({
  groups,
  nameOf,
  variant,
}: {
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  variant: DimensionVariant
}) {
  const [dimension, setDimension] = useState<Dimension>('team')
  const { aggregation } = useTimeAggregation()
  const rows = rowsFor(groups, dimension).sort((left, right) =>
    variant === 'times'
      ? timeValue(aggregation, right.avgActive, right.sumActive) -
        timeValue(aggregation, left.avgActive, left.sumActive)
      : right.tickets - left.tickets,
  )
  const label = (id: string) => nameOf(dimension, id)
  const hint =
    variant === 'times'
      ? aggregationHint(
          metricsMessages.chartHints.timesByDimension,
          aggregation,
        )
      : metricsMessages.chartHints.countsByDimension
  const columns =
    variant === 'counts'
      ? countColumns(
          label,
          maxOf(rows, (row) => row.tickets),
        )
      : timeColumns(
          label,
          aggregation,
          maxOf(rows, (row) =>
            timeValue(aggregation, row.avgActive, row.sumActive),
          ),
        )

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle as="h2" className="text-base">
          <HintLabel label={metricsMessages.dimensions.title} hint={hint} />
        </CardTitle>
        <DimensionSelector dimension={dimension} onChange={setDimension} />
      </CardHeader>
      <DimensionBody rows={rows} columns={columns} />
    </Card>
  )
}
