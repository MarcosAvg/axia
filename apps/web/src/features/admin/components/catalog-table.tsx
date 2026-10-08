import { Button } from '@/components/ui/button'
import type { AdminTable } from '../api/admin-api'
import type { AdminColumn } from '../domain/catalogs'
import { formatTargetMinutes } from '../domain/target'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'

interface CatalogTableProps {
  rows: Record<string, unknown>[]
  columns: AdminColumn[]
  optionsFor: (table: AdminTable) => AdminOption[]
  onEdit: (row: Record<string, unknown>) => void
  onToggle: (row: Record<string, unknown>) => void
}

function cellText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

function columnText(
  row: Record<string, unknown>,
  column: AdminColumn,
  optionsFor: (table: AdminTable) => AdminOption[],
): string {
  if (column.optionsTable) {
    const option = optionsFor(column.optionsTable).find(
      (candidate) => candidate.id === String(row[column.key]),
    )
    return option ? option.label : '—'
  }
  if (column.format === 'minutes') {
    const value = row[column.key]
    return formatTargetMinutes(typeof value === 'number' ? value : null)
  }
  return cellText(row[column.key])
}

/** Lista de registros de un catálogo con acciones de editar y activar/desactivar. */
export function CatalogTable({
  rows,
  columns,
  optionsFor,
  onEdit,
  onToggle,
}: CatalogTableProps) {
  const { list, actions } = adminMessages
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{list.empty}</p>
  }
  const [primary, ...secondary] = columns
  if (!primary) return null

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {rows.map((row) => (
        <li
          key={String(row.id)}
          className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {columnText(row, primary, optionsFor)}
            </span>
            <span className="text-xs text-muted-foreground">
              {secondary
                .map((column) => columnText(row, column, optionsFor))
                .join(' · ')}
            </span>
            {row.active === false ? (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {list.inactive}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onEdit(row)}
            >
              {actions.edit}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => onToggle(row)}
            >
              {row.active === false ? actions.activate : actions.deactivate}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
