import { BarChart3Icon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { HintLabel } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  return (
    <TabsContent
      key={dimension}
      value={dimension}
      className="flex flex-col gap-3"
    >
      <p className="text-xs text-muted-foreground">
        {metricsMessages.dimensions.count(rows.length)}
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
      ) : (
        <div
          className={
            showChart
              ? 'grid gap-4 lg:grid-cols-2 lg:items-start'
              : 'flex flex-col'
          }
        >
          {showChart ? (
            <DimensionChart
              id={`metrics-dim-${dimension}`}
              rows={rows}
              nameOf={label}
            />
          ) : null}
          <div className="max-h-80 overflow-auto">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(row) => row.id}
            />
          </div>
        </div>
      )}
    </TabsContent>
  )
}

/** Dimensiones en una sola tarjeta: pestañas, gráfica y tabla. */
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
  const { aggregation } = useTimeAggregation()
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
        <CardTitle as="h2" className="text-base">
          <HintLabel label={metricsMessages.dimensions.title} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="team" className="flex flex-col gap-3">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {DIMENSIONS.map((dimension) => (
              <TabsTrigger
                key={dimension}
                value={dimension}
                className="min-h-11"
              >
                {dimensionLabels[dimension]}
              </TabsTrigger>
            ))}
          </TabsList>
          {DIMENSIONS.map((dimension) => (
            <DimensionPanel
              key={dimension}
              dimension={dimension}
              groups={groups}
              nameOf={nameOf}
              variant={variant}
              aggregation={aggregation}
              showChart={showChart}
            />
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
