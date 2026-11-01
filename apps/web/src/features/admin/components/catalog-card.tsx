import { CornerDownRightIcon } from 'lucide-react'
import type { AdminTable } from '../api/admin-api'
import type { AdminCatalogTree } from '../domain/catalog-types'
import type { AdminColumn } from '../domain/catalogs'
import { CellContent } from './catalog-cell-content'
import { RowActions } from './row-actions'
import { StatusSwitch } from './status-switch'

interface CatalogCardProps {
  row: Record<string, unknown>
  columns: AdminColumn[]
  tree?: AdminCatalogTree
  depth: number
  optionsFor: (table: AdminTable) => { id: string; label: string }[]
  onEdit: (row: Record<string, unknown>) => void
  onToggle: (row: Record<string, unknown>) => void
  onDelete: (row: Record<string, unknown>) => void
}

/** Tarjeta de un registro en pantalla angosta, con todos sus datos visibles. */
export function CatalogCard({
  row,
  columns,
  tree,
  depth,
  optionsFor,
  onEdit,
  onToggle,
  onDelete,
}: CatalogCardProps) {
  const labelKey = tree?.labelKey ?? columns[0]?.key
  const nameColumn = columns.find((column) => column.key === labelKey)
  const name = nameColumn
    ? String(row[nameColumn.key] ?? '')
    : String(row.id ?? '')
  const rest = columns.filter((column) => column.key !== labelKey)

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex min-w-0 items-center gap-1.5"
          style={{ paddingInlineStart: depth * 12 }}
        >
          {depth > 0 ? (
            <CornerDownRightIcon
              className="size-3.5 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
          ) : null}
          <p className="break-words font-medium">{name || '—'}</p>
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
            onDelete={() => onDelete(row)}
          />
        </div>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {rest.map((column) => (
          <div key={column.key} className="contents">
            <dt className="text-muted-foreground">{column.label}</dt>
            <dd className="min-w-0 break-words">
              <CellContent row={row} column={column} optionsFor={optionsFor} />
            </dd>
          </div>
        ))}
      </dl>
    </li>
  )
}
