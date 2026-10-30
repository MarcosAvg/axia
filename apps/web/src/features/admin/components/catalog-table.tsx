import type { ReactNode } from 'react'
import { LibraryIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn, SortState } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { AdminTable } from '../api/admin-api'
import type { AdminColumn } from '../domain/catalogs'
import { fixedOptionLabel } from '../domain/catalog-list'
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
  onLocations?: (row: Record<string, unknown>) => void
}

function relationLabel(options: AdminOption[], value: unknown): string | null {
  return options.find((option) => option.id === String(value))?.label ?? null
}

function plainValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
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
    const label = relationLabel(optionsFor(column.optionsTable), value)
    return label ? (
      <span>{label}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }
  if (column.options) {
    return <span>{fixedOptionLabel(column.options, value)}</span>
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
  return <span>{plainValue(value)}</span>
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
  onLocations?: (row: Record<string, unknown>) => void
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
  onLocations?: (row: Record<string, unknown>) => void,
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
          onLocations={onLocations ? () => onLocations(row) : undefined}
        />
      </div>
    ),
  }
}

function buildTableColumns(
  options: BuildColumnsOptions,
): DataTableColumn<Record<string, unknown>>[] {
  const { rows, dataColumns, optionsFor, onEdit, onToggle, onLocations } =
    options
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
    actionsColumn(nameOf, onEdit, onToggle, onLocations),
  ]
}

interface CatalogCardProps {
  row: Record<string, unknown>
  columns: AdminColumn[]
  optionsFor: (table: AdminTable) => AdminOption[]
  onEdit: (row: Record<string, unknown>) => void
  onToggle: (row: Record<string, unknown>) => void
  onLocations?: (row: Record<string, unknown>) => void
}

function CatalogCard({
  row,
  columns,
  optionsFor,
  onEdit,
  onToggle,
  onLocations,
}: CatalogCardProps) {
  const dataColumns = columns.filter((column) => column.key !== 'active')
  const nameColumn = dataColumns[0]
  const name = nameColumn ? displayName(row, nameColumn) : ''

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium">{name || '—'}</p>
          {dataColumns[1] ? (
            <p className="truncate text-xs text-muted-foreground">
              <CellContent
                row={row}
                column={dataColumns[1]}
                optionsFor={optionsFor}
              />
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusSwitch
            active={row.active !== false}
            name={name}
            onToggle={() => onToggle(row)}
          />
          <RowActions
            active={row.active !== false}
            name={name}
            onEdit={() => onEdit(row)}
            onToggle={() => onToggle(row)}
            onLocations={onLocations ? () => onLocations(row) : undefined}
          />
        </div>
      </div>
      {dataColumns.length > 2 ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          {dataColumns.slice(2).map((column) => (
            <div key={column.key} className="contents">
              <dt className="text-muted-foreground">{column.label}</dt>
              <dd className="min-w-0 break-words">
                <CellContent
                  row={row}
                  column={column}
                  optionsFor={optionsFor}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  )
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
  onLocations,
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
    <>
      <ul className="flex flex-col gap-2 lg:hidden">
        {rows.map((row) => (
          <CatalogCard
            key={String(row.id)}
            row={row}
            columns={columns}
            optionsFor={optionsFor}
            onEdit={onEdit}
            onToggle={onToggle}
            onLocations={onLocations}
          />
        ))}
      </ul>
      <div className="hidden lg:block">
        <DataTable
          columns={buildTableColumns({
            rows,
            dataColumns,
            optionsFor,
            onEdit,
            onToggle,
            onLocations,
          })}
          rows={rows}
          sort={sort}
          onSortChange={onSortChange}
          getRowId={(row) => String(row.id)}
        />
      </div>
    </>
  )
}
