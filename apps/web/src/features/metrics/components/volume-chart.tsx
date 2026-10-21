import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { VolumePoint } from '../domain/metrics'
import { formatMonthLabel } from '../domain/period'
import { metricsMessages } from '../i18n'

const config = {
  tickets: { label: metricsMessages.kpi.tickets, color: 'var(--chart-1)' },
}

/** Tiquets registrados por día. */
export function VolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <ChartContainer
      id="metrics-volume"
      config={config}
      className="aspect-auto h-56"
    >
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={formatMonthLabel}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={28}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="tickets"
          type="monotone"
          isAnimationActive={false}
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={data.length === 1}
        />
      </LineChart>
    </ChartContainer>
  )
}
