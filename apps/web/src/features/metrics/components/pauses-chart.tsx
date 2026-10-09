import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { PauseReasonRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const config = {
  pauses: { label: metricsMessages.charts.pauses, color: 'var(--chart-3)' },
}

/** Pausas por motivo. */
export function PausesChart({ data }: { data: PauseReasonRow[] }) {
  const chartData = data.slice(0, 8).map((row) => ({
    name: row.reasonName,
    pauses: row.pauses,
  }))
  return (
    <ChartContainer
      id="metrics-pauses"
      config={config}
      className="aspect-auto h-48"
    >
      <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
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
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={28}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="pauses" fill="var(--chart-3)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
