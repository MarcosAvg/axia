import {
  ChevronRightIcon,
  CornerDownRightIcon,
  LibraryIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn, SortState } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { AdminTable } from '../api/admin-api'
import type { AdminCatalogTree } from '../domain/catalog-types'
import type { AdminColumn } from '../domain/catalogs'
import { adminMessages } from '../i18n'
import { CatalogCard } from './catalog-card'
import { CellContent } from './catalog-cell-content'
import { RowActions } from './row-actions'
import { StatusSwitch } from './status-switch'
import { useTreeControls, type TreeControls } from './catalog-tree-controls'

type Row = Record<string, unknown>
type OptionsFor = (table: AdminTable) => { id: string; label: string }[]

interface CatalogTableProps {
  rows: Row[]
  columns: AdminColumn[]
  tree?: AdminCatalogTree
  isFiltering: boolean
  optionsFor: OptionsFor
  sort: SortState | null
  onSortChange: (key: string) => void
  onEdit: (row: Row) => void
  onToggle: (row: Row) => void
}

function nameOf(row: Row, columns: AdminColumn[], tree?: AdminCatalogTree) {
  const key = tree?.labelKey ?? columns[0]?.key
  return key ? String(row[key] ?? '') : ''
}

function activeColumn(
  name: (row: Row) => string,
  onToggle: (row: Row) => void,
): DataTableColumn<Row> {
  return {
    id: 'active',
    header: adminMessages.list.active,
    align: 'center',
    className: 'w-24',
    sortable: true,
    cell: (row) => (
      <div className="flex justify-center">
        <StatusSwitch
          active={row.active !== false}
          name={name(row)}
          onToggle={() => onToggle(row)}
        />
      </div>
    ),
  }
}

function actionsColumn(
  name: (row: Row) => string,
  onEdit: (row: Row) => void,
  onToggle: (row: Row) => void,
): DataTableColumn<Row> {
  return {
    id: 'actions',
    header: '',
    align: 'right',
    className:
      'sticky right-0 z-10 w-14 border-l bg-card shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.18)]',
    cell: (row) => (
      <div className="flex justify-end">
        <RowActions
          active={row.active !== false}
          name={name(row)}
          onEdit={() => onEdit(row)}
          onToggle={() => onToggle(row)}
        />
      </div>
    ),
  }
}

function TreeMarker({
  name,
  row,
  depth,
  controls,
}: {
  name: string
  row: Row
  depth: number
  controls: TreeControls
}) {
  if (!controls.hasChildren(row)) {
    return depth > 0 ? (
      <CornerDownRightIcon
        className="size-3.5 shrink-0 text-muted-foreground/70"
        aria-hidden
      />
    ) : null
  }
  const isCollapsed = controls.isCollapsed(row)
  return (
    <button
      type="button"
      aria-expanded={!isCollapsed}
      aria-label={`${isCollapsed ? adminMessages.list.expand : adminMessages.list.collapse}: ${name}`}
      className="shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => {
        event.stopPropagation()
        controls.toggle(row)
      }}
    >
      <ChevronRightIcon
        className={cn(
          'size-4 transition-transform',
          !isCollapsed && 'rotate-90',
        )}
      />
    </button>
  )
}

function LabelCell({
  row,
  column,
  tree,
  controls,
  optionsFor,
}: {
  row: Row
  column: AdminColumn
  tree: AdminCatalogTree
  controls: TreeControls
  optionsFor: OptionsFor
}) {
  const depth = controls.depthOf(row)
  return (
    <span
      className="flex min-w-0 items-center gap-1.5 font-medium text-foreground"
      style={{ paddingInlineStart: depth * 16 }}
      title={String(row.path ?? '')}
    >
      <TreeMarker
        name={String(row[tree.labelKey ?? 'name'] ?? '')}
        row={row}
        depth={depth}
        controls={controls}
      />
      <span className="truncate">
        <CellContent row={row} column={column} optionsFor={optionsFor} />
      </span>
    </span>
  )
}

function buildColumns(
  options: CatalogTableProps & { controls?: TreeControls },
): DataTableColumn<Row>[] {
  const { columns, optionsFor, tree, controls, onEdit, onToggle } = options
  const label = (row: Row) => nameOf(row, columns, tree)
  return [
    ...columns.map((column) => ({
      id: column.key,
      header: column.label,
      align: column.align,
      hideBelow: column.hideBelow,
      sortable: true,
      cell: (row: Row) =>
        tree &&
        controls &&
        column.key === (tree.labelKey ?? columns[0]?.key) ? (
          <LabelCell
            row={row}
            column={column}
            tree={tree}
            controls={controls}
            optionsFor={optionsFor}
          />
        ) : (
          <CellContent row={row} column={column} optionsFor={optionsFor} />
        ),
    })),
    activeColumn(label, onToggle),
    actionsColumn(label, onEdit, onToggle),
  ]
}

/** Lista de registros de un catálogo con columnas propias, orden y acciones. */
export function CatalogTable(props: CatalogTableProps) {
  const { rows, columns, tree, isFiltering, optionsFor, sort } = props
  const { controls, visible } = useTreeControls(rows, tree, isFiltering)
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState icon={LibraryIcon} title={adminMessages.list.empty} />
      </div>
    )
  }
  const depthOf = controls?.depthOf ?? (() => 0)
  return (
    <>
      <ul className="flex flex-col gap-2 lg:hidden">
        {visible.map((row) => (
          <CatalogCard
            key={String(row.id)}
            row={row}
            columns={columns}
            tree={tree}
            depth={depthOf(row)}
            optionsFor={optionsFor}
            onEdit={props.onEdit}
            onToggle={props.onToggle}
          />
        ))}
      </ul>
      <div className="hidden lg:block">
        <DataTable
          columns={buildColumns({ ...props, controls })}
          rows={visible}
          sort={sort}
          onSortChange={props.onSortChange}
          getRowId={(row) => String(row.id)}
        />
      </div>
    </>
  )
}
