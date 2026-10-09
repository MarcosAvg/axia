import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatMonthLabel, volumeByMonth } from '@/features/metrics'
import type { MetricsTicket } from '@/features/metrics'
import { statusLabels } from '@/features/tickets'
import type { StatusCount } from '../domain/summary'
import { dashboardMessages as t } from '../i18n'

const volumeConfig = {
  tickets: { label: t.charts.volume, color: 'var(--chart-1)' },
}

const statusConfig = {
  count: { label: t.charts.status, color: 'var(--chart-2)' },
}

function VolumeChartCard({ tickets }: { tickets: MetricsTicket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.charts.volume}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          id="dashboard-volume"
          config={volumeConfig}
          className="aspect-auto h-48"
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

function StatusChartCard({ counts }: { counts: StatusCount[] }) {
  const data = counts.map((item) => ({
    name: (statusLabels as Record<string, string>)[item.status] ?? item.status,
    count: item.count,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.charts.status}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          id="dashboard-status"
          config={statusConfig}
          className="aspect-auto h-48"
        >
          <BarChart data={data} margin={{ left: 4, right: 8 }}>
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
            <Bar dataKey="count" fill="var(--chart-2)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/** Gráficas del panel: volumen mensual y distribución por estado. */
export function DashboardCharts({
  tickets,
  statusCounts,
}: {
  tickets: MetricsTicket[]
  statusCounts: StatusCount[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <VolumeChartCard tickets={tickets} />
      <StatusChartCard counts={statusCounts} />
    </div>
  )
}
