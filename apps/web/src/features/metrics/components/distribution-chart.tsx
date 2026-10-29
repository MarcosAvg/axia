import type { Dimension } from '../domain/dimensions'
import { buildHierarchy } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { dimensionLabels, metricsMessages } from '../i18n'
import { HIERARCHY_COLORS, HierarchyChart } from './hierarchy-chart'
import { RankingBars } from './ranking-bars'

const t = metricsMessages.distribution

/** Dimensiones que se dibujan como jerarquía. */
export const HIERARCHY = new Set<Dimension>([
  'subcategory',
  'problem',
  'location',
])

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function HierarchyPanel({
  nodes,
  dimension,
  total,
  unclassified,
}: {
  nodes: ReturnType<typeof buildHierarchy>
  dimension: Dimension
  total: number
  unclassified: number
}) {
  const classified = Math.max(0, total - unclassified)
  const top3 = nodes.slice(0, 3).reduce((sum, node) => sum + node.value, 0)
  return (
    <div className="flex flex-col gap-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label={t.total} value={String(total)} />
        <Stat label={t.withData} value={String(classified)} />
        <Stat
          label={`Sin ${dimensionLabels[dimension].toLowerCase()}`}
          value={String(unclassified)}
        />
        <Stat
          label={t.concentration}
          value={formatPercent(shareOf(top3, total))}
        />
      </dl>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t.top}
        </p>
        <ul className="flex flex-col gap-1 text-xs">
          {nodes.slice(0, 5).map((node, index) => (
            <li key={node.id} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  background: HIERARCHY_COLORS[index % HIERARCHY_COLORS.length],
                }}
                aria-hidden
              />
              <span className="min-w-0 truncate text-muted-foreground">
                {node.name || t.withoutData}
              </span>
              <span className="ml-auto tabular-nums">{node.value}</span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {formatPercent(shareOf(node.value, total))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Gráfica de la dimensión: jerarquía o ranking. */
export function DistributionChart({
  dimension,
  tree,
  chartRows,
  unclassified,
  pathLabels,
  total,
}: {
  dimension: Dimension
  tree: ReturnType<typeof buildHierarchy>
  chartRows: { id: string; name: string; value: number; label: string }[]
  unclassified: number
  pathLabels: string
  total: number
}) {
  if (!HIERARCHY.has(dimension)) {
    return (
      <RankingBars rows={chartRows} label={metricsMessages.table.tickets} />
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{pathLabels}</p>
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <HierarchyChart nodes={tree} ariaLabel={pathLabels} />
        </div>
        <HierarchyPanel
          nodes={tree}
          dimension={dimension}
          total={total}
          unclassified={unclassified}
        />
      </div>
    </div>
  )
}
