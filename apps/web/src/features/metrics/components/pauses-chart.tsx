import { PauseIcon } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/shared/empty-state'
import type { PauseReasonRow } from '../domain/metrics'
import { cumulativeShare } from '../domain/visuals'
import { metricsMessages } from '../i18n'

const config = {
  pauses: { label: metricsMessages.charts.pauses, color: 'var(--chart-3)' },
  share: { label: 'Acumulado', color: 'var(--chart-1)' },
}

interface PausePoint {
  name: string
  pauses: number
  share: number
}

function PausesPareto({ data }: { data: PausePoint[] }) {
  return (
    <ChartContainer
      id="metrics-pauses"
      config={config}
      className="aspect-auto h-56"
    >
      <ComposedChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={64}
        />
        <YAxis
          yAxisId="count"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={28}
          fontSize={11}
        />
        <YAxis
          yAxisId="share"
          orientation="right"
          domain={[0, 1]}
          tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
          tickLine={false}
          axisLine={false}
          width={38}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          yAxisId="count"
          dataKey="pauses"
          fill="var(--chart-3)"
          radius={4}
          isAnimationActive={false}
        />
        <Line
          yAxisId="share"
          dataKey="share"
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          tooltipType="none"
        />
      </ComposedChart>
    </ChartContainer>
  )
}

/** Pausas por motivo (Pareto: barras y acumulado). */
export function PausesChart({ data }: { data: PauseReasonRow[] }) {
  if (data.length === 0) {
    return <EmptyState icon={PauseIcon} title={metricsMessages.empty} />
  }
  const sorted = [...data]
    .sort((left, right) => right.pauses - left.pauses)
    .slice(0, 8)
  const shares = cumulativeShare(sorted.map((row) => row.pauses))
  const chartData = sorted.map((row, index) => ({
    name: row.reasonName,
    pauses: row.pauses,
    share: shares[index] ?? 0,
  }))
  return <PausesPareto data={chartData} />
}
