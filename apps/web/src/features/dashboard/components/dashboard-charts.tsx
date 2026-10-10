import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatMonthLabel, volumeByMonth } from '@/features/metrics'
import type { MetricsTicket } from '@/features/metrics'
import { dashboardMessages as t } from '../i18n'

const volumeConfig = {
  tickets: { label: t.charts.volume, color: 'var(--chart-1)' },
}

/** Tiquets por mes del usuario. */
export function DashboardCharts({ tickets }: { tickets: MetricsTicket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.charts.volume}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          id="dashboard-volume"
          config={volumeConfig}
          className="aspect-auto h-56"
        >
          <LineChart
            data={volumeByMonth(tickets)}
            margin={{ left: 4, right: 8 }}
          >
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
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
