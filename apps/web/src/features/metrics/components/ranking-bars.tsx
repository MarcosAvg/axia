import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

export interface RankRow {
  id: string
  name: string
  value: number
  label: string
}

function shortName(name: string) {
  return name.length > 22 ? `${name.slice(0, 21)}…` : name
}

/** Ranking horizontal para una dimensión plana. */
export function RankingBars({
  rows,
  label,
  height: heightProp,
}: {
  rows: RankRow[]
  label: string
  height?: number
}) {
  const height = heightProp ?? Math.max(180, rows.length * 32)
  const config = {
    value: { label, color: 'var(--chart-1)' },
  }
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ left: 4, right: 96, top: 4, bottom: 4 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={156}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={shortName}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill="var(--chart-1)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="label"
            position="right"
            fontSize={11}
            className="fill-muted-foreground"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
