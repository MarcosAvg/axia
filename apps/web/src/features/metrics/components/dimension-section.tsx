import { BarChart3Icon } from 'lucide-react'
import { HintLabel } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import {
  aggregationHint,
  aggregationLabel,
  timeValue,
} from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
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

export type DimensionVariant = 'counts' | 'times'

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
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'recapture',
      header: t.recapture,
      hint: hints.recapture,
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
      cell: (row) =>
        formatMinutes(timeValue(aggregation, row.avgTotal, row.sumTotal)),
    },
  ]
}

/** Una dimensión: encabezado, gráfica opcional y su tabla. */
export function DimensionSection({
  dimension,
  groups,
  nameOf,
  variant,
  withChart = false,
}: {
  dimension: Dimension
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  variant: DimensionVariant
  withChart?: boolean
}) {
  const { aggregation } = useTimeAggregation()
  const rows = groups
    .filter((group) => group.dimension === dimension)
    .map((group) => group.row)
  const label = (id: string) => nameOf(dimension, id)
  const columns =
    variant === 'counts' ? countColumns(label) : timeColumns(label, aggregation)
  const hint =
    variant === 'times'
      ? aggregationHint(
          metricsMessages.chartHints.timesByDimension,
          aggregation,
        )
      : metricsMessages.chartHints.countsByDimension
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <HintLabel label={dimensionLabels[dimension]} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {withChart ? (
          <DimensionChart
            id={`metrics-dim-${dimension}`}
            rows={rows}
            nameOf={label}
          />
        ) : null}
        {rows.length === 0 ? (
          <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
        ) : (
          <div className="max-h-64 overflow-auto">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(row) => row.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
