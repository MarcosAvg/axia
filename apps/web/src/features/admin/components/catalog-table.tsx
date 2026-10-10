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

interface BuildColumnsOptions {
  rows: Record<string, unknown>[]
  dataColumns: AdminColumn[]
  optionsFor: (table: AdminTable) => AdminOption[]
  onEdit: (row: Record<string, unknown>) => void
  onToggle: (row: Record<string, unknown>) => void
}

function depthFunction(
  rows: Record<string, unknown>[],
  indentBy: string,
): (row: Record<string, unknown>) => number {
  const byId = new Map(rows.map((row) => [String(row.id), row]))
  return (row) => {
    let depth = 0
    let cursor = row[indentBy]
    while (cursor && byId.has(String(cursor)) && depth < 50) {
      depth += 1
      cursor = byId.get(String(cursor))?.[indentBy]
    }
    return depth
  }
}

function activeColumn(
  nameOf: (row: Record<string, unknown>) => string,
  onToggle: (row: Record<string, unknown>) => void,
): DataTableColumn<Record<string, unknown>> {
  return {
    id: 'active',
    header: adminMessages.list.active,
    align: 'center',
    className: 'w-24',
    cell: (row) => (
      <div className="flex justify-center">
        <StatusSwitch
          active={row.active !== false}
          name={nameOf(row)}
          onToggle={() => onToggle(row)}
        />
      </div>
    ),
  }
}

function actionsColumn(
  nameOf: (row: Record<string, unknown>) => string,
  onEdit: (row: Record<string, unknown>) => void,
  onToggle: (row: Record<string, unknown>) => void,
): DataTableColumn<Record<string, unknown>> {
  return {
    id: 'actions',
    header: '',
    align: 'right',
    className: 'w-14',
    cell: (row) => (
      <div className="flex justify-end">
        <RowActions
          active={row.active !== false}
          name={nameOf(row)}
          onEdit={() => onEdit(row)}
          onToggle={() => onToggle(row)}
        />
      </div>
    ),
  }
}

function buildTableColumns(
  options: BuildColumnsOptions,
): DataTableColumn<Record<string, unknown>>[] {
  const { rows, dataColumns, optionsFor, onEdit, onToggle } = options
  const nameColumn = dataColumns[0]
  const nameOf = (row: Record<string, unknown>) =>
    nameColumn ? displayName(row, nameColumn) : ''
  const indentBy = nameColumn?.indentBy
  const depthOf = indentBy ? depthFunction(rows, indentBy) : undefined

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
        if (index !== 0) return content
        const prefix = indentBy && depthOf ? '— '.repeat(depthOf(row)) : ''
        return (
          <span className="font-medium text-foreground">
            {prefix}
            {content}
          </span>
        )
      },
    })),
    activeColumn(nameOf, onToggle),
    actionsColumn(nameOf, onEdit, onToggle),
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
      columns={buildTableColumns({
        rows,
        dataColumns,
        optionsFor,
        onEdit,
        onToggle,
      })}
      rows={rows}
      sort={sort}
      onSortChange={onSortChange}
      getRowId={(row) => String(row.id)}
    />
  )
}
