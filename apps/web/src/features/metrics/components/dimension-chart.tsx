import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatMinutes } from '../domain/metrics'
import type { DimensionRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const config = {
  active: { label: metricsMessages.table.avgActive, color: 'var(--chart-2)' },
}

/** Promedio de trabajo activo por dimensión (primeras 8). */
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
    active: Math.round(row.avgActive),
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
        <YAxis tickLine={false} axisLine={false} width={40} fontSize={11} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatMinutes(Number(value))}
            />
          }
        />
        <Bar dataKey="active" fill="var(--chart-2)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
