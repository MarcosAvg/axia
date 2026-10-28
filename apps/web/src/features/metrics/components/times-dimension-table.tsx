import { useState } from 'react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { timeValue } from '@/lib/time-aggregation'
import type {
  Dimension,
  DimensionGroup,
  DimensionRow,
} from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import { ChartCard } from './chart-card'
import { DimensionPicker } from './dimension-picker'

const t = metricsMessages.times
const k = metricsMessages.kpi

const MEASURES = [
  { key: 'avgActive', label: k.active },
  { key: 'avgTotal', label: k.total },
  { key: 'avgResponse', label: t.phases.response },
  { key: 'avgAssignment', label: t.phases.assignment },
  { key: 'avgValidation', label: t.phases.validation },
  { key: 'avgPause', label: t.phases.pause },
  { key: 'avgWait', label: t.phases.wait },
] as const

type Measure = (typeof MEASURES)[number]['key']

function measureValue(
  row: DimensionRow,
  measure: Measure,
  aggregation: 'average' | 'total',
) {
  return measure === 'avgActive'
    ? timeValue(aggregation, row.avgActive, row.sumActive)
    : Number(row[measure])
}

function timeColumns(
  measure: Measure,
  max: number,
  aggregation: 'average' | 'total',
  label: string,
): DataTableColumn<DimensionRow>[] {
  return [
    {
      id: 'name',
      header: metricsMessages.table.name,
      cell: (row) => row.name || 'Sin dato',
    },
    {
      id: 'tickets',
      header: metricsMessages.table.tickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'measure',
      header: label,
      cell: (row) => {
        const value = measureValue(row, measure, aggregation)
        return (
          <BarCell
            value={value}
            max={max}
            label={formatMinutes(value)}
            className="min-w-44"
          />
        )
      },
    },
    {
      id: 'reassignment',
      header: metricsMessages.table.reassignment,
      hideBelow: 'lg',
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'reopen',
      header: k.reopen,
      hideBelow: 'lg',
      cell: (row) => formatPercent(row.reopenRate),
    },
  ]
}

/** Tabla de tiempos por dimensión con selector de medida. */
export function TimesDimensionTable({ groups }: { groups: DimensionGroup[] }) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const [measure, setMeasure] = useState<Measure>('avgActive')
  const { aggregation } = useTimeAggregation()
  const rows = [...rowsByDimension(groups, dimension)].sort(
    (left, right) =>
      measureValue(right, measure, aggregation) -
      measureValue(left, measure, aggregation),
  )
  const max = Math.max(
    1,
    ...rows.map((row) => measureValue(row, measure, aggregation)),
  )
  const measureLabel =
    measure === 'avgActive'
      ? aggregation === 'total'
        ? `${k.active} (acumulado)`
        : k.active
      : (MEASURES.find((item) => item.key === measure)?.label ?? measure)
  return (
    <ChartCard title={t.byDimension}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DimensionPicker value={dimension} onChange={setDimension} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t.measure}</span>
            <select
              value={measure}
              aria-label={t.measure}
              onChange={(event) => setMeasure(event.target.value as Measure)}
              className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
            >
              {MEASURES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={timeColumns(measure, max, aggregation, measureLabel)}
            rows={rows}
            getRowId={(row) => `${dimension}:${row.id}`}
          />
        </div>
      </div>
    </ChartCard>
  )
}
