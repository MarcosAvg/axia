import { statusLabels } from '@/features/tickets'
import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import type {
  AgingRow,
  MetricsSummary,
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
  VolumePoint,
} from '../domain/metrics'
import type { Comparison } from '../domain/period'
import { formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { HealthStrip } from './health-strip'
import { RankingBars } from './ranking-bars'
import { SatisfactionPanel, SlaPanel } from './sla-panels'
import { StatusDistribution } from './status-distribution'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

function TopCategories({ groups }: { groups: DimensionGroup[] }) {
  const rows = rowsByDimension(groups, 'category')
  const total = rows.reduce((sum, row) => sum + row.tickets, 0)
  const chartRows = rows.slice(0, 6).map((row) => ({
    id: row.id,
    name: row.name || 'Sin dato',
    value: row.tickets,
    label: `${row.tickets} · ${formatPercent(shareOf(row.tickets, total))}`,
  }))
  return (
    <ChartCard
      title={metricsMessages.charts.topCategories}
      hint={metricsMessages.chartHints.countsByDimension}
    >
      {chartRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <RankingBars rows={chartRows} label={metricsMessages.table.tickets} />
      )}
    </ChartCard>
  )
}

function AgingCard({ aging }: { aging: AgingRow[] }) {
  return (
    <ChartCard
      title={metricsMessages.aging.title}
      hint={metricsMessages.chartHints.aging}
    >
      <div className="max-h-80 overflow-auto">
        <AgingList rows={aging} statusLabel={statusLabel} />
      </div>
    </ChartCard>
  )
}

/** Resumen: salud, volumen, estado, categorías, SLA, satisfacción y antigüedad. */
export function SummaryTab({
  volume,
  aging,
  groups,
  summary,
  comparison,
  satisfaction,
  satisfactionDistribution,
  sla,
  slaRows,
}: {
  volume: VolumePoint[]
  aging: AgingRow[]
  groups: DimensionGroup[]
  summary: MetricsSummary
  comparison: Comparison | null
  satisfaction: SatisfactionSummary
  satisfactionDistribution: number[]
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <HealthStrip
        summary={summary}
        comparison={comparison}
        satisfaction={satisfaction}
        sla={sla}
      />
      <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <ChartCard
            title={metricsMessages.charts.volume}
            hint={metricsMessages.chartHints.volume}
          >
            <VolumeChart data={volume} />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <StatusDistribution groups={groups} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <TopCategories groups={groups} />
        <SatisfactionPanel
          satisfaction={satisfaction}
          distribution={satisfactionDistribution}
        />
      </div>
      <SlaPanel sla={sla} rows={slaRows} />
      <AgingCard aging={aging} />
    </div>
  )
}
