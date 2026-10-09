import { UsersIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/shared/empty-state'
import type { TechnicianRow } from '../domain/indicators'
import { metricsMessages } from '../i18n'

const config = {
  tickets: {
    label: metricsMessages.technicians.tickets,
    color: 'var(--chart-1)',
  },
}

/** Tiquets por técnico (los de mayor carga). */
export function TechnicianChart({ rows }: { rows: TechnicianRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={UsersIcon} title={metricsMessages.empty} />
  }
  const data = [...rows]
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 8)
    .map((row) => ({ name: row.name, tickets: row.tickets }))
  return (
    <ChartContainer
      id="metrics-technicians"
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
          angle={-20}
          textAnchor="end"
          height={64}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={32}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="tickets" fill="var(--chart-1)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
