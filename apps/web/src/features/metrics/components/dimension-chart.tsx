import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { DimensionRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const config = {
  tickets: { label: metricsMessages.table.tickets, color: 'var(--chart-1)' },
}

/** Tiquets por dimensión (primeras 8). */
export function DimensionChart({
  id,
  rows,
  nameOf,
}: {
  id: string
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  const data = rows.slice(0, 8).map((row) => ({
    name: nameOf(row.id),
    tickets: row.tickets,
  }))
  return (
    <ChartContainer id={id} config={config}>
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
