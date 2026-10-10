import { BarChart3Icon } from 'lucide-react'
import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import type { DimensionRow } from '../domain/metrics'
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
      header: t.avgActive,
      hint: hints.avgActive,
      cell: (row) => formatMinutes(row.avgActive),
    },
    {
      id: 'avgTotal',
      header: t.avgTotal,
      hint: hints.avgTotal,
      cell: (row) => formatMinutes(row.avgTotal),
    },
    {
      id: 'extra',
      header: t.extra,
      hint: hints.extra,
      cell: (row) => formatMinutes(row.avgActiveExtra),
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
  const rows = groups
    .filter((group) => group.dimension === dimension)
    .map((group) => group.row)
  const label = (id: string) => nameOf(dimension, id)
  const columns =
    variant === 'counts' ? countColumns(label) : timeColumns(label)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <HintLabel
            label={dimensionLabels[dimension]}
            hint={
              variant === 'times'
                ? metricsMessages.chartHints.timesByDimension
                : metricsMessages.chartHints.countsByDimension
            }
          />
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
