import { CopyIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/shared/empty-state'
import { duplicateRateByDimension } from '../domain/duplicates'
import type { Dimension } from '../domain/dimensions'
import type { DuplicateDimensionRow } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const config = {
  rate: { label: metricsMessages.duplicates.rate, color: 'var(--chart-3)' },
}

/** Tasa de duplicados por dimensión. */
export function DuplicateRateChart({
  rows,
}: {
  rows: DuplicateDimensionRow[]
}) {
  const data = duplicateRateByDimension(rows).map((item) => ({
    name: dimensionLabels[item.dimension as Dimension] ?? item.dimension,
    rate: Math.round(item.rate * 100),
  }))
  if (data.length === 0) {
    return <EmptyState icon={CopyIcon} title={metricsMessages.empty} />
  }
  return (
    <ChartContainer
      id="metrics-duplicate-rate"
      config={config}
      className="aspect-auto h-40"
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
        <Bar dataKey="rate" fill="var(--chart-3)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
