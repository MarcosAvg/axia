import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { EmptyState } from '@/components/shared/empty-state'
import { BarChart3Icon } from 'lucide-react'
import type { DimensionGroup } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.status

const FAMILIES = [
  {
    key: 'initial',
    statuses: ['registered', 'with_supervisor', 'assigned'],
    color: 'var(--chart-1)',
  },
  { key: 'progress', statuses: ['in_progress'], color: 'var(--chart-2)' },
  { key: 'paused', statuses: ['paused'], color: 'var(--warning)' },
  {
    key: 'validation',
    statuses: ['attended', 'under_claim'],
    color: 'var(--chart-4)',
  },
  { key: 'closed', statuses: ['closed'], color: 'var(--success)' },
  {
    key: 'discarded',
    statuses: ['rejected', 'cancelled', 'duplicate'],
    color: 'var(--destructive)',
  },
] as const

function statusData(groups: DimensionGroup[]) {
  const byStatus = new Map(
    groups
      .filter((group) => group.dimension === 'status')
      .map((group) => [group.row.id, group.row]),
  )
  const total = [...byStatus.values()].reduce(
    (sum, row) => sum + row.tickets,
    0,
  )
  const families = FAMILIES.map((family) => {
    const tickets = family.statuses.reduce(
      (sum, status) => sum + (byStatus.get(status)?.tickets ?? 0),
      0,
    )
    return {
      key: family.key,
      label: t.families[family.key],
      color: family.color,
      tickets,
      valueLabel: `${tickets} · ${formatPercent(shareOf(tickets, total))}`,
    }
  }).filter((family) => family.tickets > 0)
  return { families, total }
}

/** Barras de las seis familias del estado actual. */
export function StatusChart({ groups }: { groups: DimensionGroup[] }) {
  const { families, total } = statusData(groups)
  if (families.length === 0) {
    return (
      <ChartCard title={t.title} hint={metricsMessages.chartHints.status}>
        <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
      </ChartCard>
    )
  }
  const config = {
    tickets: {
      label: metricsMessages.table.tickets,
      color: 'var(--chart-1)',
    },
  }
  return (
    <ChartCard title={t.title} hint={metricsMessages.chartHints.status}>
      <ChartContainer config={config} className="aspect-auto h-60">
        <BarChart
          data={families}
          layout="vertical"
          margin={{ left: 4, right: 64, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="tickets"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {families.map((family) => (
              <Cell key={family.key} fill={family.color} />
            ))}
            <LabelList
              dataKey="valueLabel"
              position="right"
              fontSize={11}
              className="fill-muted-foreground"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">
        Total del periodo: {total} tiquets.
      </p>
    </ChartCard>
  )
}
