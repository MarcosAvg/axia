import { LibraryIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
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

function StatusCell({ active }: { active: boolean }) {
  const { list } = adminMessages
  if (active) {
    return (
      <Badge className="bg-success/10 text-success dark:bg-success/20">
        {list.active}
      </Badge>
    )
  }
  return (
    <Badge className="bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning">
      {list.inactive}
    </Badge>
  )
}

function ActionsCell({
  row,
  onEdit,
  onToggle,
}: {
  row: Record<string, unknown>
  onEdit: (row: Record<string, unknown>) => void
  onToggle: (row: Record<string, unknown>) => void
}) {
  const { actions } = adminMessages
  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-9"
        onClick={() => onEdit(row)}
      >
        {actions.edit}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="min-h-9"
        onClick={() => onToggle(row)}
      >
        {row.active === false ? actions.activate : actions.deactivate}
      </Button>
    </div>
  )
}

function buildColumns(
  columns: AdminColumn[],
  optionsFor: (table: AdminTable) => AdminOption[],
  onEdit: (row: Record<string, unknown>) => void,
  onToggle: (row: Record<string, unknown>) => void,
): DataTableColumn<Record<string, unknown>>[] {
  const [primary, ...secondary] = columns
  return [
    {
      id: primary?.key ?? 'primary',
      header: primary?.label ?? '',
      cell: (row) => (
        <span className="font-medium">
          {primary ? columnText(row, primary, optionsFor) : '—'}
        </span>
      ),
    },
    {
      id: 'details',
      header: '',
      cell: (row) => (
        <span className="text-muted-foreground">
          {secondary
            .map((column) => columnText(row, column, optionsFor))
            .join(' · ')}
        </span>
      ),
    },
    {
      id: 'status',
      header: adminMessages.list.active,
      cell: (row) => <StatusCell active={row.active !== false} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <ActionsCell row={row} onEdit={onEdit} onToggle={onToggle} />
      ),
    },
  ]
}

/** Lista de registros de un catálogo con acciones de editar y activar/desactivar. */
export function CatalogTable({
  rows,
  columns,
  optionsFor,
  onEdit,
  onToggle,
}: CatalogTableProps) {
  if (rows.length === 0) {
    return <EmptyState icon={LibraryIcon} title={adminMessages.list.empty} />
  }

  return (
    <DataTable
      columns={buildColumns(columns, optionsFor, onEdit, onToggle)}
      rows={rows}
      getRowId={(row) => String(row.id)}
    />
  )
}
