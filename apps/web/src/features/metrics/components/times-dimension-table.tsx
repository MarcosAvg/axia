import { useId, useState } from 'react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { HintIcon } from '@/components/shared/hint'
import { useTimeMeasure } from '@/components/shared/time-measure-context'
import { isRobustMeasure, type TimeMeasure } from '@/lib/time-measure'
import { measureSample, measureValue, type TimeMode } from '../domain/time-mode'
import type {
  Dimension,
  DimensionGroup,
  DimensionRow,
} from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatMinutes, formatPercent, MIN_SAMPLE } from '../domain/metrics'
import { dimensionValueLabel, metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import { ChartCard } from './chart-card'
import { DimensionPicker } from './dimension-picker'

const t = metricsMessages.times
const k = metricsMessages.kpi

const MEASURES = [
  { key: 'active', label: k.active },
  { key: 'total', label: k.total },
  { key: 'resolution', label: k.resolution },
  { key: 'response', label: t.phases.response },
  { key: 'assignment', label: t.phases.assignment },
  { key: 'pending_take', label: t.phases.pending_take },
  { key: 'reassignment', label: metricsMessages.kpi.reassignment },
  { key: 'validation', label: t.phases.validation },
  { key: 'pause', label: t.phases.pause },
  { key: 'dormant', label: t.phases.dormant },
  { key: 'claim', label: t.phases.claim },
  { key: 'wait', label: t.phases.wait },
] as const

type Measure = (typeof MEASURES)[number]['key']

function valueOf(
  row: DimensionRow,
  key: Measure,
  measure: TimeMeasure,
  mode: TimeMode,
) {
  return measureValue(
    row as unknown as Record<string, number>,
    key,
    mode,
    measure,
  )
}

function measureLabelOf(label: string, measure: TimeMeasure): string {
  if (measure === 'average') return label
  return `${label} (${metricsMessages.measure.tags[measure]})`
}

function identityColumns(
  dimension: Dimension,
): DataTableColumn<DimensionRow>[] {
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
      hint: metricsMessages.tableHints.dimensionTickets,
      cell: (row) => row.tickets,
    },
  ]
}

function sampleColumn(
  measureKey: Measure,
  measure: TimeMeasure,
  mode: TimeMode,
): DataTableColumn<DimensionRow> {
  return {
    id: 'sample',
    header: t.sample,
    hint: metricsMessages.timesHints.dimensionSample,
    hideBelow: 'lg',
    cell: (row) =>
      measureSample(
        row as unknown as Record<string, number>,
        measureKey,
        measure,
        mode,
      ) ?? 0,
  }
}

function measureColumn({
  measureKey,
  measure,
  max,
  label,
  mode,
}: {
  measureKey: Measure
  measure: TimeMeasure
  max: number
  label: string
  mode: TimeMode
}): DataTableColumn<DimensionRow> {
  return {
    id: 'measure',
    header: label,
    hint: metricsMessages.timesHints.dimensionMeasure,
    cell: (row) => {
      const sample = measureSample(
        row as unknown as Record<string, number>,
        measureKey,
        measure,
        mode,
      )
      if (sample !== null && sample < MIN_SAMPLE) {
        return (
          <span title={t.insufficientSample} className="text-muted-foreground">
            —
          </span>
        )
      }
      const value = valueOf(row, measureKey, measure, mode)
      return (
        <BarCell
          value={value}
          max={max}
          label={formatMinutes(value)}
          className="min-w-44"
        />
      )
    },
  }
}

function rateColumns(): DataTableColumn<DimensionRow>[] {
  return [
    {
      id: 'reassignment',
      header: metricsMessages.table.reassignment,
      hint: metricsMessages.tableHints.reassignment,
      hideBelow: 'lg',
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'reopen',
      header: k.reopen,
      hint: metricsMessages.kpiHints.reopen,
      hideBelow: 'lg',
      cell: (row) => formatPercent(row.reopenRate),
    },
  ]
}

function timeColumns({
  dimension,
  measureKey,
  measure,
  max,
  label,
  mode,
}: {
  dimension: Dimension
  measureKey: Measure
  measure: TimeMeasure
  max: number
  label: string
  mode: TimeMode
}): DataTableColumn<DimensionRow>[] {
  const columns = identityColumns(dimension)
  if (isRobustMeasure(measure)) {
    columns.push(sampleColumn(measureKey, measure, mode))
  }
  columns.push(measureColumn({ measureKey, measure, max, label, mode }))
  columns.push(...rateColumns())
  return columns
}

function MeasurePicker({
  measureKey,
  onChange,
}: {
  measureKey: Measure
  onChange: (measure: Measure) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <label htmlFor={id}>{t.measure}</label>
      <HintIcon
        hint={metricsMessages.timesHints.dimensionMeasure}
        label={t.measure}
      />
      <select
        id={id}
        value={measureKey}
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
    </div>
  )
}

/** Tabla de tiempos por dimensión con selector de fase y medida global. */
export function TimesDimensionTable({
  groups,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
}) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const [measureKey, setMeasureKey] = useState<Measure>('active')
  const { measure } = useTimeMeasure()
  const rows = [...rowsByDimension(groups, dimension)].sort(
    (left, right) =>
      valueOf(right, measureKey, measure, mode) -
      valueOf(left, measureKey, measure, mode),
  )
  const max = Math.max(
    1,
    ...rows.map((row) => valueOf(row, measureKey, measure, mode)),
  )
  const label = measureLabelOf(
    MEASURES.find((item) => item.key === measureKey)?.label ?? measureKey,
    measure,
  )
  return (
    <ChartCard
      title={t.byDimension}
      hint={metricsMessages.chartHints.timesByDimension}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DimensionPicker value={dimension} onChange={setDimension} />
          <MeasurePicker measureKey={measureKey} onChange={setMeasureKey} />
        </div>
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={timeColumns({
              dimension,
              measureKey,
              measure,
              max,
              label,
              mode,
            })}
            rows={rows}
            getRowId={(row) => `${dimension}:${row.id}`}
          />
        </div>
      </div>
    </ChartCard>
  )
}
