import { useState } from 'react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { modeValue, totalInMode, type TimeMode } from '../domain/time-mode'
import type {
  Dimension,
  DimensionGroup,
  DimensionRow,
} from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { dimensionValueLabel, metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import { ChartCard } from './chart-card'
import { DimensionPicker } from './dimension-picker'

const t = metricsMessages.times
const k = metricsMessages.kpi

const MEASURES = [
  { key: 'avgActive', label: k.active },
  { key: 'avgTotalAll', label: k.total },
  { key: 'avgTotalClosed', label: k.resolution },
  { key: 'avgResponse', label: t.phases.response },
  { key: 'avgAssignment', label: t.phases.assignment },
  { key: 'avgPendingTake', label: t.phases.pending_take },
  { key: 'avgReassignment', label: metricsMessages.kpi.reassignment },
  { key: 'avgValidation', label: t.phases.validation },
  { key: 'avgPause', label: t.phases.pause },
  { key: 'avgDormant', label: t.phases.dormant },
  { key: 'avgClaim', label: t.phases.claim },
  { key: 'avgWait', label: t.phases.wait },
] as const

type Measure = (typeof MEASURES)[number]['key']

function measureValue(
  row: DimensionRow,
  measure: Measure,
  aggregation: 'average' | 'total',
  mode: TimeMode,
) {
  if (measure === 'avgTotalAll') {
    return modeValue(
      row as unknown as Record<string, number>,
      'total',
      mode,
      aggregation,
    )
  }
  if (measure === 'avgTotalClosed') {
    return aggregation === 'total'
      ? totalInMode(row.sumTotalClosed, row.sumTotalClosedLabor, mode)
      : totalInMode(row.avgTotalClosed, row.avgTotalClosedLabor, mode)
  }
  const key = measure.replace(/^avg/, '')
  const normalized = key[0]?.toLowerCase() + key.slice(1)
  return modeValue(
    row as unknown as Record<string, number>,
    normalized,
    mode,
    aggregation,
  )
}

function timeColumns({
  dimension,
  measure,
  max,
  aggregation,
  label,
  mode,
}: {
  dimension: Dimension
  measure: Measure
  max: number
  aggregation: 'average' | 'total'
  label: string
  mode: TimeMode
}): DataTableColumn<DimensionRow>[] {
  return [
    {
      id: 'name',
      header: metricsMessages.table.name,
      cell: (row) =>
        dimensionValueLabel(dimension, row.id, row.name) || 'Sin dato',
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
        const value = measureValue(row, measure, aggregation, mode)
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

function measureLabelOf(measure: Measure, aggregation: 'average' | 'total') {
  if (measure === 'avgActive') {
    return aggregation === 'total' ? `${k.active} (acumulado)` : k.active
  }
  return MEASURES.find((item) => item.key === measure)?.label ?? measure
}

function MeasurePicker({
  measure,
  onChange,
}: {
  measure: Measure
  onChange: (measure: Measure) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{t.measure}</span>
      <select
        value={measure}
        aria-label={t.measure}
        onChange={(event) => onChange(event.target.value as Measure)}
        className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
      >
        {MEASURES.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Tabla de tiempos por dimensión con selector de medida. */
export function TimesDimensionTable({
  groups,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
}) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const [measure, setMeasure] = useState<Measure>('avgActive')
  const { aggregation } = useTimeAggregation()
  const rows = [...rowsByDimension(groups, dimension)].sort(
    (left, right) =>
      measureValue(right, measure, aggregation, mode) -
      measureValue(left, measure, aggregation, mode),
  )
  const max = Math.max(
    1,
    ...rows.map((row) => measureValue(row, measure, aggregation, mode)),
  )
  const measureLabel = measureLabelOf(measure, aggregation)
  return (
    <ChartCard title={t.byDimension}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DimensionPicker value={dimension} onChange={setDimension} />
          <MeasurePicker measure={measure} onChange={setMeasure} />
        </div>
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={timeColumns({
              dimension,
              mode,
              measure,
              max,
              aggregation,
              label: measureLabel,
            })}
            rows={rows}
            getRowId={(row) => `${dimension}:${row.id}`}
          />
        </div>
      </div>
    </ChartCard>
  )
}
