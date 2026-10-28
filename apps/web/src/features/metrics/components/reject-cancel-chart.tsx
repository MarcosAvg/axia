import { BanIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/shared/empty-state'
import type { RejectCancelRow } from '../domain/indicators'
import { metricsMessages } from '../i18n'

const config = {
  rejected: {
    label: metricsMessages.rejectCancel.rejected,
    color: 'var(--chart-4)',
  },
  cancelled: {
    label: metricsMessages.rejectCancel.cancelled,
    color: 'var(--chart-5)',
  },
}

interface ReasonRow {
  name: string
  rejected: number
  cancelled: number
}

function reasonData(rows: RejectCancelRow[]): ReasonRow[] {
  const byReason = new Map<string, ReasonRow>()
  for (const row of rows) {
    const entry = byReason.get(row.reasonName) ?? {
      name: row.reasonName,
      rejected: 0,
      cancelled: 0,
    }
    if (row.eventType === 'cancelled') entry.cancelled += row.tickets
    else entry.rejected += row.tickets
    byReason.set(row.reasonName, entry)
  }
  return [...byReason.values()]
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-sm bg-[var(--chart-4)]" aria-hidden />
        {metricsMessages.rejectCancel.rejected}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-sm bg-[var(--chart-5)]" aria-hidden />
        {metricsMessages.rejectCancel.cancelled}
      </span>
    </div>
  )
}

/** Rechazos y cancelaciones por motivo. */
export function RejectCancelChart({ rows }: { rows: RejectCancelRow[] }) {
  const data = reasonData(rows)
  if (data.length === 0) {
    return <EmptyState icon={BanIcon} title={metricsMessages.empty} />
  }
  return (
    <div className="flex flex-col gap-2">
      <Legend />
      <ChartContainer
        id="metrics-reject-cancel"
        config={config}
        className="aspect-auto h-48 lg:h-56"
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
            width={28}
            fontSize={11}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="rejected"
            stackId="a"
            fill="var(--chart-4)"
            radius={4}
            isAnimationActive={false}
          />
          <Bar
            dataKey="cancelled"
            stackId="a"
            fill="var(--chart-5)"
            radius={4}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
