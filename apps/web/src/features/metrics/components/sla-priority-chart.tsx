import { GaugeIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/shared/empty-state'
import type { SlaPriorityRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const config = {
  rate: { label: metricsMessages.sla.rate, color: 'var(--chart-2)' },
}

/** Cumplimiento de tiempos objetivo por prioridad. */
export function SlaPriorityChart({ rows }: { rows: SlaPriorityRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={GaugeIcon} title={metricsMessages.sla.empty} />
  }
  const data = rows.map((row) => ({
    name: row.priorityName,
    rate: Math.round((row.complianceRate ?? 0) * 100),
  }))
  return (
    <ChartContainer
      id="metrics-sla-priority"
      config={config}
      className="aspect-auto h-48"
    >
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          interval={0}
        />
        <YAxis
          domain={[0, 100]}
          unit="%"
          tickLine={false}
          axisLine={false}
          width={40}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="rate" fill="var(--chart-2)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
