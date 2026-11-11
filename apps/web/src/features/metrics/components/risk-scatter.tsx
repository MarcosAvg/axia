import type { ReactNode } from 'react'
import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import type { RiskMeasure } from '../domain/quality'
import { activeMinutesInMode, riskRate } from '../domain/quality'
import { formatMinutes } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.quality

const RISK_LABELS: Record<RiskMeasure, string> = {
  reopen: metricsMessages.kpi.reopen,
  recapture: metricsMessages.kpi.recapture,
  reassignment: metricsMessages.kpi.reassignment,
}

const RISK_MEASURES = Object.keys(RISK_LABELS) as RiskMeasure[]

interface RiskPoint {
  id: string
  name: string
  tickets: number
  rate: number
  measureLabel: string
  active: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRiskPoint(value: unknown): value is RiskPoint {
  if (!isRecord(value)) return false
  return (
    typeof value.name === 'string' &&
    typeof value.tickets === 'number' &&
    typeof value.rate === 'number' &&
    typeof value.measureLabel === 'string' &&
    typeof value.active === 'number'
  )
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  )
}

/** Tooltip con el nombre completo de la agrupación y sus valores legibles. */
export function RiskTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !isRiskPoint(point)) {
    return null
  }
  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground">
      <p className="font-medium">{point.name}</p>
      <dl className="grid gap-1">
        <MetricRow
          label={metricsMessages.table.tickets}
          value={point.tickets}
        />
        <MetricRow label={point.measureLabel} value={`${point.rate}%`} />
        <MetricRow
          label={metricsMessages.times.phases.active}
          value={formatMinutes(point.active)}
        />
      </dl>
    </div>
  )
}

function RiskChart({
  points,
  measureLabel,
}: {
  points: RiskPoint[]
  measureLabel: string
}) {
  const config = {
    tickets: {
      label: metricsMessages.table.tickets,
      color: 'var(--chart-1)',
    },
    rate: { label: measureLabel, color: 'var(--chart-5)' },
    active: {
      label: metricsMessages.times.phases.active,
      color: 'var(--chart-1)',
    },
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-64">
      <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
        <XAxis
          type="number"
          dataKey="tickets"
          name={metricsMessages.table.tickets}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          type="number"
          dataKey="rate"
          name={measureLabel}
          width={40}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ZAxis
          type="number"
          dataKey="active"
          name={metricsMessages.times.phases.active}
          range={[60, 280]}
        />
        <ChartTooltip content={<RiskTooltip />} />
        <Scatter
          data={points}
          fill="var(--chart-5)"
          isAnimationActive={false}
        />
      </ScatterChart>
    </ChartContainer>
  )
}

function riskColumns(measureLabel: string): DataTableColumn<RiskPoint>[] {
  return [
    {
      id: 'name',
      header: metricsMessages.table.name,
      cell: (row) => row.name,
      className: 'max-w-40 truncate',
    },
    {
      id: 'tickets',
      header: metricsMessages.table.tickets,
      align: 'right',
      cell: (row) => row.tickets,
    },
    {
      id: 'rate',
      header: measureLabel,
      align: 'right',
      cell: (row) => `${row.rate}%`,
    },
    {
      id: 'active',
      header: metricsMessages.times.phases.active,
      align: 'right',
      hideBelow: 'lg',
      cell: (row) => formatMinutes(row.active),
    },
  ]
}

function RiskMeasurePicker({
  measure,
  onChange,
}: {
  measure: RiskMeasure
  onChange: (measure: RiskMeasure) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{t.riskMeasure}</span>
      <select
        value={measure}
        aria-label={t.riskMeasure}
        onChange={(event) => onChange(event.target.value as RiskMeasure)}
        className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
      >
        {RISK_MEASURES.map((key) => (
          <option key={key} value={key}>
            {RISK_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Tiquets contra la señal de riesgo elegida, con el detalle de cada grupo. */
export function RiskScatter({
  groups,
  dimension,
  measure,
  mode,
  onMeasureChange,
}: {
  groups: DimensionGroup[]
  dimension: Dimension
  measure: RiskMeasure
  mode: TimeMode
  onMeasureChange: (measure: RiskMeasure) => void
}) {
  const measureLabel = RISK_LABELS[measure]
  const rows = rowsByDimension(groups, dimension).slice(0, 10)
  const points: RiskPoint[] = rows.map((row) => ({
    id: row.id,
    name: row.name || 'Sin dato',
    tickets: row.tickets,
    rate: Math.round(riskRate(row, measure) * 100),
    measureLabel,
    active: activeMinutesInMode(row, mode),
  }))
  return (
    <ChartCard title={t.risk} hint={t.riskHint}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <RiskMeasurePicker measure={measure} onChange={onMeasureChange} />
        </div>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metricsMessages.empty}
          </p>
        ) : (
          <>
            <RiskChart points={points} measureLabel={measureLabel} />
            <div className="max-h-56 overflow-auto">
              <DataTable
                columns={riskColumns(measureLabel)}
                rows={points}
                getRowId={(row) => row.id}
              />
            </div>
          </>
        )}
      </div>
    </ChartCard>
  )
}
