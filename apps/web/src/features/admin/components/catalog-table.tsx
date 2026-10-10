import type { ReactNode } from 'react'
import { LibraryIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn, SortState } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { AdminTable } from '../api/admin-api'
import type { AdminColumn } from '../domain/catalogs'
import { formatTargetMinutes } from '../domain/target'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { RowActions } from './row-actions'
import { StatusSwitch } from './status-switch'

interface CatalogTableProps {
  rows: Record<string, unknown>[]
  columns: AdminColumn[]
  optionsFor: (table: AdminTable) => AdminOption[]
  sort: SortState | null
  onSortChange: (key: string) => void
  onEdit: (row: Record<string, unknown>) => void
  onToggle: (row: Record<string, unknown>) => void
}

function CellContent({
  row,
  column,
  optionsFor,
}: {
  row: Record<string, unknown>
  column: AdminColumn
  optionsFor: (table: AdminTable) => AdminOption[]
}) {
  const value = row[column.key]
  if (column.optionsTable) {
    const option = optionsFor(column.optionsTable).find(
      (candidate) => candidate.id === String(value),
    )
    return option ? (
      <span>{option.label}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }
  if (column.format === 'minutes') {
    return (
      <span>
        {formatTargetMinutes(typeof value === 'number' ? value : null)}
      </span>
    )
  }
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  if (typeof value === 'boolean') return <span>{value ? 'Sí' : 'No'}</span>
  return <span>{String(value)}</span>
}

function displayName(
  row: Record<string, unknown>,
  column: AdminColumn,
): string {
  const value = row[column.key]
  return value === null || value === undefined ? '' : String(value)
}

function buildTableColumns(
  dataColumns: AdminColumn[],
  optionsFor: (table: AdminTable) => AdminOption[],
  onEdit: (row: Record<string, unknown>) => void,
  onToggle: (row: Record<string, unknown>) => void,
): DataTableColumn<Record<string, unknown>>[] {
  const nameColumn = dataColumns[0]
  const nameOf = (row: Record<string, unknown>) =>
    nameColumn ? displayName(row, nameColumn) : ''

  return [
    ...dataColumns.map((column, index) => ({
      id: column.key,
      header: column.label,
      align: column.align,
      sortable: true,
      cell: (row: Record<string, unknown>) => {
        const content: ReactNode = (
          <CellContent row={row} column={column} optionsFor={optionsFor} />
        )
        return index === 0 ? (
          <span className="font-medium text-foreground">{content}</span>
        ) : (
          content
        )
      },
    })),
    {
      id: 'active',
      header: adminMessages.list.active,
      align: 'center' as const,
      className: 'w-24',
      cell: (row: Record<string, unknown>) => (
        <div className="flex justify-center">
          <StatusSwitch
            active={row.active !== false}
            name={nameOf(row)}
            onToggle={() => onToggle(row)}
          />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right' as const,
      className: 'w-14',
      cell: (row: Record<string, unknown>) => (
        <div className="flex justify-end">
          <RowActions
            active={row.active !== false}
            name={nameOf(row)}
            onEdit={() => onEdit(row)}
            onToggle={() => onToggle(row)}
          />
        </div>
      ),
    },
  ]
}

/** Lista de registros de un catálogo con columnas propias, orden y acciones. */
export function CatalogTable({
  rows,
  columns,
  optionsFor,
  sort,
  onSortChange,
  onEdit,
  onToggle,
}: CatalogTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState icon={LibraryIcon} title={adminMessages.list.empty} />
      </div>
    )
  }

  const dataColumns = columns.filter((column) => column.key !== 'active')

  return (
    <DataTable
      columns={buildTableColumns(dataColumns, optionsFor, onEdit, onToggle)}
      rows={rows}
      sort={sort}
      onSortChange={onSortChange}
      getRowId={(row) => String(row.id)}
    />
  )
}
