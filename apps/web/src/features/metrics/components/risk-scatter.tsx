import type { ReactNode } from 'react'
import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.quality

const config = {
  tickets: { label: metricsMessages.table.tickets, color: 'var(--chart-1)' },
  reopen: { label: metricsMessages.kpi.reopen, color: 'var(--chart-5)' },
  active: {
    label: metricsMessages.times.phases.active,
    color: 'var(--chart-1)',
  },
}

interface RiskPoint {
  id: string
  name: string
  tickets: number
  reopen: number
  active: number
}

const columns: DataTableColumn<RiskPoint>[] = [
  {
    id: 'name',
    header: metricsMessages.filters.category,
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
    id: 'reopen',
    header: metricsMessages.kpi.reopen,
    align: 'right',
    cell: (row) => `${row.reopen}%`,
  },
  {
    id: 'active',
    header: metricsMessages.times.phases.active,
    align: 'right',
    hideBelow: 'lg',
    cell: (row) => formatMinutes(row.active),
  },
]

function isRiskPoint(value: unknown): value is RiskPoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'tickets' in value &&
    typeof value.tickets === 'number' &&
    'reopen' in value &&
    typeof value.reopen === 'number' &&
    'active' in value &&
    typeof value.active === 'number'
  )
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  )
}

/** Tooltip con el nombre completo de la categoría y sus valores legibles. */
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
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{point.name}</p>
      <dl className="grid gap-1">
        <MetricRow
          label={metricsMessages.table.tickets}
          value={point.tickets}
        />
        <MetricRow
          label={metricsMessages.kpi.reopen}
          value={`${point.reopen}%`}
        />
        <MetricRow
          label={metricsMessages.times.phases.active}
          value={formatMinutes(point.active)}
        />
      </dl>
    </div>
  )
}

function RiskChart({ points }: { points: RiskPoint[] }) {
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
          dataKey="reopen"
          name={metricsMessages.kpi.reopen}
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

/** Tiquets contra tasa de reapertura, con el detalle de cada categoría. */
export function RiskScatter({ groups }: { groups: DimensionGroup[] }) {
  const rows = rowsByDimension(groups, 'category').slice(0, 10)
  const points: RiskPoint[] = rows.map((row) => ({
    id: row.id,
    name: row.name || 'Sin dato',
    tickets: row.tickets,
    reopen: Math.round(row.reopenRate * 100),
    active: row.avgActive,
  }))
  return (
    <ChartCard title={t.risk} hint={t.riskHint}>
      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <RiskChart points={points} />
          <div className="max-h-56 overflow-auto">
            <DataTable
              columns={columns}
              rows={points}
              getRowId={(row) => row.id}
            />
          </div>
        </div>
      )}
    </ChartCard>
  )
}
