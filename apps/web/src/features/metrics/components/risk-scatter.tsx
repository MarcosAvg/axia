import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { RankingBars } from './ranking-bars'

const t = metricsMessages.quality

function RiskBars({ rows }: { rows: DimensionGroup['row'][] }) {
  const volumeRows = rows.map((row) => ({
    id: row.id,
    name: row.name || 'Sin dato',
    value: row.tickets,
    label: String(row.tickets),
  }))
  return (
    <ChartCard title={t.risk} hint={t.riskHint}>
      <div className="flex flex-col gap-2">
        <RankingBars
          rows={volumeRows}
          label={metricsMessages.table.tickets}
          height={280}
        />
        <p className="text-xs text-muted-foreground">
          Sin reaperturas en el periodo; se muestra el volumen por categoría.
        </p>
      </div>
    </ChartCard>
  )
}

/** Tiquets contra tasa de reapertura, con el tiempo activo como burbuja. */
export function RiskScatter({ groups }: { groups: DimensionGroup[] }) {
  const rows = rowsByDimension(groups, 'category').slice(0, 10)
  const hasRisk = rows.some((row) => row.reopenRate > 0)
  if (!hasRisk) return <RiskBars rows={rows} />
  const points = rows.map((row) => ({
    name: row.name || 'Sin dato',
    tickets: row.tickets,
    reopen: Math.round(row.reopenRate * 100),
    active: row.avgActive,
  }))
  const config = {
    tickets: { label: metricsMessages.table.tickets, color: 'var(--chart-1)' },
    reopen: { label: metricsMessages.kpi.reopen, color: 'var(--chart-5)' },
  }
  return (
    <ChartCard title={t.risk} hint={t.riskHint}>
      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-64">
          <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
            <XAxis
              type="number"
              dataKey="tickets"
              name={metricsMessages.table.tickets}
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
            <ZAxis type="number" dataKey="active" range={[60, 280]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Scatter
              data={points}
              fill="var(--chart-5)"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
