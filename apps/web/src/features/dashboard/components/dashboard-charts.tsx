import { TicketIcon } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatMonthLabel } from '@/features/metrics'
import type { VolumePoint } from '@/features/metrics'
import { dashboardMessages as t } from '../i18n'

const volumeConfig = {
  tickets: { label: t.charts.volume, color: 'var(--chart-1)' },
}

/** Tiquets por mes del usuario. */
export function DashboardCharts({ volume }: { volume: VolumePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          {t.charts.volume}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {volume.length === 0 ? (
          <EmptyState icon={TicketIcon} title={t.charts.empty} />
        ) : (
          <ChartContainer
            id="dashboard-volume"
            config={volumeConfig}
            className="aspect-auto h-56"
          >
            <LineChart data={volume} margin={{ left: 4, right: 8 }}>
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
                dot={volume.length === 1}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
