import type { DataTableColumn } from '@/components/shared/data-table'
import type { DimensionRow } from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { modeValue, type TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { StackedBarCell } from './bar-cell'

const t = metricsMessages.team

function nameColumn(): DataTableColumn<DimensionRow> {
  return {
    id: 'name',
    header: t.teams,
    cell: (row) => row.name || 'Sin dato',
  }
}

function ticketsColumn(): DataTableColumn<DimensionRow> {
  return {
    id: 'tickets',
    header: metricsMessages.table.tickets,
    cell: (row) => row.tickets,
  }
}

function statusColumn(): DataTableColumn<DimensionRow> {
  return {
    id: 'status',
    header: `${t.open} / ${t.closed}`,
    cell: (row) => (
      <StackedBarCell
        segments={[
          { key: 'open', value: row.open, color: 'var(--warning)' },
          { key: 'closed', value: row.closed, color: 'var(--success)' },
        ]}
        label={`${row.open} / ${row.closed}`}
        className="min-w-32"
      />
    ),
  }
}

function timeColumn(
  key: 'active' | 'total',
  header: string,
  hideBelow: 'lg' | 'xl',
  mode: TimeMode,
): DataTableColumn<DimensionRow> {
  return {
    id: key,
    header,
    hideBelow,
    cell: (row) =>
      formatMinutes(
        modeValue(
          row as unknown as Record<string, number>,
          key,
          mode,
          'average',
        ),
      ),
  }
}

function qualityColumns(): DataTableColumn<DimensionRow>[] {
  return [
    {
      id: 'reassignment',
      header: metricsMessages.table.reassignment,
      hideBelow: 'md',
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'reopen',
      header: metricsMessages.kpi.reopen,
      hideBelow: 'md',
      cell: (row) => formatPercent(row.reopenRate),
    },
    {
      id: 'firstFix',
      header: metricsMessages.quality.firstFix,
      hideBelow: 'xl',
      cell: (row) => formatPercent(row.firstFixRate),
    },
  ]
}

/** Columnas del resumen por equipo, según el modo de tiempo activo. */
export function teamColumns(mode: TimeMode): DataTableColumn<DimensionRow>[] {
  return [
    nameColumn(),
    ticketsColumn(),
    statusColumn(),
    timeColumn('active', metricsMessages.table.avgActive, 'lg', mode),
    timeColumn('total', metricsMessages.table.avgTotal, 'xl', mode),
    ...qualityColumns(),
  ]
}
