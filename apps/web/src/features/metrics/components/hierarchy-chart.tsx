import { BarChart3Icon } from 'lucide-react'
import { ResponsiveContainer, SunburstChart, Tooltip } from 'recharts'
import { EmptyState } from '@/components/shared/empty-state'
import type { HierarchyNode } from '../domain/dimensions'
import { metricsMessages } from '../i18n'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

interface PaintedNode extends HierarchyNode {
  fill: string
}

function paint(nodes: HierarchyNode[], color: string): PaintedNode[] {
  return nodes.map((node) => ({
    ...node,
    fill: color,
    children: paint(node.children, color),
  }))
}

/** Composición jerárquica con anillos (categoría → subcategoría → problema). */
export function HierarchyChart({
  nodes,
  ariaLabel,
}: {
  nodes: HierarchyNode[]
  ariaLabel: string
}) {
  const total = nodes.reduce((sum, node) => sum + node.value, 0)
  if (nodes.length === 0 || total === 0) {
    return <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
  }
  const painted = nodes.map(
    (node, index) => paint([node], COLORS[index % COLORS.length]!)[0]!,
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="h-80 w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <SunburstChart
            data={{
              name: metricsMessages.kpi.tickets,
              value: total,
              children: painted,
            }}
            innerRadius={38}
            ringPadding={2}
            stroke="var(--background)"
          >
            <Tooltip />
          </SunburstChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {nodes.slice(0, 8).map((node, index) => (
          <li key={node.id} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {node.name || 'Sin dato'}
            </span>
            <span className="font-medium tabular-nums">{node.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
