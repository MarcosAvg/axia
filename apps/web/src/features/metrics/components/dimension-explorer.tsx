import { useState } from 'react'
import { BarChart3Icon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { SelectField } from '@/components/shared/form-fields'
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
import { DimensionChart } from './dimension-chart'

const t = metricsMessages.table
const hints = metricsMessages.tableHints

type DimensionVariant = 'counts' | 'times'

function countColumns(
  nameOf: (id: string) => string,
): DataTableColumn<DimensionRow>[] {
  return [
    { id: 'name', header: t.name, cell: (row) => nameOf(row.id) },
    {
      id: 'tickets',
      header: t.tickets,
      hint: hints.dimensionTickets,
      cell: (row) => row.tickets,
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
): DataTableColumn<DimensionRow>[] {
  return [
    { id: 'name', header: t.name, cell: (row) => nameOf(row.id) },
    {
      id: 'tickets',
      header: t.tickets,
      hint: hints.dimensionTickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'avgActive',
      header: aggregationLabel(t.avgActive, aggregation),
      hint: hints.avgActive,
      cell: (row) =>
        formatMinutes(timeValue(aggregation, row.avgActive, row.sumActive)),
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

function DimensionPanel({
  dimension,
  groups,
  nameOf,
  variant,
  aggregation,
  showChart,
}: {
  dimension: Dimension
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  variant: DimensionVariant
  aggregation: TimeAggregation
  showChart: boolean
}) {
  const rows = rowsFor(groups, dimension)
  const label = (id: string) => nameOf(dimension, id)
  const columns =
    variant === 'counts' ? countColumns(label) : timeColumns(label, aggregation)
  if (rows.length === 0) {
    return <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
  }
  return (
    <div
      className={
        showChart ? 'grid gap-4 lg:grid-cols-2 lg:items-start' : 'flex flex-col'
      }
    >
      {showChart ? (
        <DimensionChart
          id={`metrics-dim-${variant}-${dimension}`}
          rows={rows}
          nameOf={label}
        />
      ) : null}
      <div className="max-h-80 overflow-auto">
        <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />
      </div>
    </div>
  )
}

function DimensionPicker({
  id,
  dimension,
  count,
  onChange,
}: {
  id: string
  dimension: Dimension
  count: number
  onChange: (dimension: Dimension) => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="w-48">
        <SelectField
          id={id}
          label={metricsMessages.dimensions.viewBy}
          options={DIMENSIONS.map((value) => ({
            value,
            label: dimensionLabels[value],
          }))}
          value={dimension}
          onChange={(event) => onChange(event.target.value as Dimension)}
          className="min-h-11 lg:min-h-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {metricsMessages.dimensions.count(count)}
      </p>
    </div>
  )
}

/** Dimensiones en una sola tarjeta: selector, gráfica y tabla. */
export function DimensionExplorer({
  groups,
  nameOf,
  variant,
  showChart = false,
}: {
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  variant: DimensionVariant
  showChart?: boolean
}) {
  const [dimension, setDimension] = useState<Dimension>('team')
  const { aggregation } = useTimeAggregation()
  const hint =
    variant === 'times'
      ? aggregationHint(
          metricsMessages.chartHints.timesByDimension,
          aggregation,
        )
      : metricsMessages.chartHints.countsByDimension
  const rows = rowsFor(groups, dimension)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          <HintLabel label={metricsMessages.dimensions.title} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DimensionPicker
          id={`metrics-dimension-${variant}`}
          dimension={dimension}
          count={rows.length}
          onChange={setDimension}
        />
        <DimensionPanel
          dimension={dimension}
          groups={groups}
          nameOf={nameOf}
          variant={variant}
          aggregation={aggregation}
          showChart={showChart}
        />
      </CardContent>
    </Card>
  )
}
