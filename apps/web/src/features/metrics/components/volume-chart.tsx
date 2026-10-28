import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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
  if (data.length < 2) {
    const point = data[0]
    return (
      <div className="flex min-h-32 flex-col justify-center gap-1">
        <span className="text-3xl font-semibold tabular-nums">
          {point?.tickets ?? 0}
        </span>
        <span className="text-xs text-muted-foreground">
          {point ? formatMonthLabel(point.month) : metricsMessages.empty}
        </span>
        <span className="text-xs text-muted-foreground">
          {metricsMessages.charts.volumeSingle}
        </span>
      </div>
    )
  }
  return (
    <ChartContainer
      id="metrics-volume"
      config={config}
      className="aspect-auto h-60"
    >
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="metrics-volume-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          dataKey="tickets"
          type="monotone"
          fill="url(#metrics-volume-fill)"
          stroke="var(--chart-1)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
