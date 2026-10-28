import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { HintLabel } from '@/components/shared/hint'
import { statusLabels } from '@/features/tickets'
import { BarCell } from './bar-cell'
import {
  buildHierarchy,
  hierarchyPath,
  parentDimension,
  rowsByDimension,
} from '../domain/dimensions'
import type {
  Dimension,
  DimensionGroup,
  DimensionRow,
} from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { dimensionLabels, metricsMessages } from '../i18n'
import { DimensionPicker } from './dimension-picker'
import { HierarchyChart } from './hierarchy-chart'
import { RankingBars } from './ranking-bars'

const t = metricsMessages.distribution
const HIERARCHY = new Set<Dimension>(['subcategory', 'problem', 'location'])

function rowName(row: DimensionRow, dimension: Dimension) {
  if (dimension === 'status') {
    return (
      (statusLabels as Record<string, string>)[row.id] ?? (row.name || row.id)
    )
  }
  if (!row.id || !row.name) {
    return `Sin ${dimensionLabels[dimension].toLowerCase()}`
  }
  return row.name
}

function identityColumns(
  rows: DimensionRow[],
  dimension: Dimension,
): DataTableColumn<DimensionRow>[] {
  const max = Math.max(1, ...rows.map((item) => item.tickets))
  return [
    {
      id: 'name',
      header: metricsMessages.table.name,
      cell: (row) => rowName(row, dimension),
    },
    {
      id: 'tickets',
      header: metricsMessages.table.tickets,
      cell: (row) => (
        <BarCell
          value={row.tickets}
          max={max}
          label={row.tickets}
          className="min-w-40"
        />
      ),
    },
  ]
}

function shareColumns({
  total,
  cumulative,
  parent,
  parentTotals,
  parentNames,
}: {
  total: number
  cumulative: Map<string, number>
  parent: Dimension | null
  parentTotals: Map<string, number>
  parentNames: Map<string, string>
}): DataTableColumn<DimensionRow>[] {
  const columns: DataTableColumn<DimensionRow>[] = [
    {
      id: 'share',
      header: t.share,
      cell: (row) => formatPercent(shareOf(row.tickets, total)),
    },
    {
      id: 'cumulative',
      header: t.cumulative,
      hideBelow: 'md',
      cell: (row) => formatPercent(shareOf(cumulative.get(row.id) ?? 0, total)),
    },
  ]
  if (!parent) return columns
  return [
    {
      id: 'parent',
      header: metricsMessages.table.parent,
      hideBelow: 'md',
      cell: (row) =>
        row.parentId ? (parentNames.get(row.parentId) ?? '—') : '—',
    },
    ...columns,
    {
      id: 'parentShare',
      header: t.parentShare,
      hideBelow: 'md',
      cell: (row) => {
        if (!row.parentId) return '—'
        const parentTotal = parentTotals.get(row.parentId) ?? 0
        return parentTotal > 0
          ? formatPercent(shareOf(row.tickets, parentTotal))
          : '—'
      },
    },
  ]
}

function timeColumns(): DataTableColumn<DimensionRow>[] {
  return [
    {
      id: 'active',
      header: metricsMessages.table.avgActive,
      hint: metricsMessages.tableHints.avgActive,
      hideBelow: 'lg',
      cell: (row) => formatMinutes(row.avgActive),
    },
    {
      id: 'total',
      header: metricsMessages.table.avgTotal,
      hint: metricsMessages.tableHints.avgTotal,
      hideBelow: 'xl',
      cell: (row) => formatMinutes(row.avgTotal),
    },
  ]
}

function qualityColumns(): DataTableColumn<DimensionRow>[] {
  return [
    {
      id: 'reassignment',
      header: metricsMessages.table.reassignment,
      hideBelow: '2xl',
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'reopen',
      header: metricsMessages.kpi.reopen,
      hideBelow: '2xl',
      cell: (row) => formatPercent(row.reopenRate),
    },
    {
      id: 'firstFix',
      header: metricsMessages.quality.firstFix,
      hideBelow: '2xl',
      cell: (row) => formatPercent(row.firstFixRate),
    },
  ]
}

function DistributionTable({
  rows,
  dimension,
  parentTotals,
  parentNames,
}: {
  rows: DimensionRow[]
  dimension: Dimension
  parentTotals: Map<string, number>
  parentNames: Map<string, string>
}) {
  const total = rows.reduce((sum, row) => sum + row.tickets, 0)
  const parent = parentDimension(dimension)
  const cumulative = new Map<string, number>()
  let accumulated = 0
  for (const row of rows) {
    accumulated += row.tickets
    cumulative.set(row.id, accumulated)
  }
  const columns = [
    ...identityColumns(rows, dimension),
    ...shareColumns({
      total,
      cumulative,
      parent,
      parentTotals,
      parentNames,
    }),
    ...timeColumns(),
    ...qualityColumns(),
  ]
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => `${dimension}:${row.id}`}
    />
  )
}

function DistributionChart({
  dimension,
  tree,
  chartRows,
  unclassified,
  pathLabels,
}: {
  dimension: Dimension
  tree: ReturnType<typeof buildHierarchy>
  chartRows: { id: string; name: string; value: number; label: string }[]
  unclassified: number
  pathLabels: string
}) {
  if (!HIERARCHY.has(dimension)) {
    return (
      <RankingBars rows={chartRows} label={metricsMessages.table.tickets} />
    )
  }
  return (
    <>
      <p className="text-xs text-muted-foreground">{pathLabels}</p>
      {unclassified > 0 ? (
        <p className="text-xs text-muted-foreground">
          {unclassified} sin {dimensionLabels[dimension].toLowerCase()} (solo en
          la tabla).
        </p>
      ) : null}
      <HierarchyChart nodes={tree} ariaLabel={pathLabels} />
    </>
  )
}

/** Distribución por dimensión con jerarquía, ranking y detalle. */
export function DistributionTab({ groups }: { groups: DimensionGroup[] }) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const rows = rowsByDimension(groups, dimension)
  const total = rows.reduce((sum, row) => sum + row.tickets, 0)
  const parent = parentDimension(dimension)
  const parentRows = parent ? rowsByDimension(groups, parent) : []
  const parentTotals = new Map(parentRows.map((row) => [row.id, row.tickets]))
  const parentNames = new Map(parentRows.map((row) => [row.id, row.name]))
  const tree = HIERARCHY.has(dimension)
    ? buildHierarchy(groups, hierarchyPath(dimension))
    : []
  const chartRows = rows.slice(0, 10).map((row) => ({
    id: row.id,
    name: rowName(row, dimension),
    value: row.tickets,
    label: `${row.tickets} · ${formatPercent(shareOf(row.tickets, total))}`,
  }))
  const pathLabels = hierarchyPath(dimension)
    .map((value) => dimensionLabels[value])
    .join(' → ')
  const unclassified = rows
    .filter((row) => !row.id || !row.name)
    .reduce((sum, row) => sum + row.tickets, 0)

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <CardTitle as="h2" className="text-base">
            <HintLabel
              label={t.title}
              hint={metricsMessages.chartHints.countsByDimension}
            />
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t.subtitle} {total} tiquets.
          </p>
        </div>
        <DimensionPicker value={dimension} onChange={setDimension} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DistributionChart
          dimension={dimension}
          tree={tree}
          chartRows={chartRows}
          unclassified={unclassified}
          pathLabels={pathLabels}
        />
        <DistributionTable
          rows={rows}
          dimension={dimension}
          parentTotals={parentTotals}
          parentNames={parentNames}
        />
      </CardContent>
    </Card>
  )
}
