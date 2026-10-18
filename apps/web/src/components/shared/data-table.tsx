import type { ReactNode } from 'react'
import { cn } from 'cn'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import type { SortState } from '@/lib/sort'
import { HintIcon } from '@/components/shared/hint'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type { SortState }

type ColumnAlign = 'left' | 'right' | 'center'

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Clase aplicada a la celda y a su encabezado. */
  className?: string
  /** Oculta la columna por debajo del punto de quiebre indicado. */
  hideBelow?: 'sm' | 'md' | 'lg'
  /** Alineación del encabezado y de las celdas. */
  align?: ColumnAlign
  /** Habilita el orden por esta columna (requiere `onSortChange`). */
  sortable?: boolean
  /** Explicación del encabezado (ícono de información). */
  hint?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  sort?: SortState | null
  onSortChange?: (key: string) => void
  /** Se muestra en lugar de la tabla cuando no hay filas. */
  empty?: ReactNode
}

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const

const alignClasses: Record<ColumnAlign, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

function columnClass<T>(column: DataTableColumn<T>): string | undefined {
  return cn(
    column.hideBelow ? hideClasses[column.hideBelow] : undefined,
    column.align ? alignClasses[column.align] : undefined,
    column.className,
  )
}

function SortIcon({
  active,
  dir,
}: {
  active: boolean
  dir: 'asc' | 'desc' | undefined
}) {
  if (!active) {
    return (
      <ArrowUpDownIcon className="size-3.5 opacity-0 group-hover:opacity-60" />
    )
  }
  return dir === 'asc' ? (
    <ArrowUpIcon className="size-3.5" />
  ) : (
    <ArrowDownIcon className="size-3.5" />
  )
}

function sortAria(
  active: boolean,
  dir: 'asc' | 'desc' | undefined,
): 'none' | 'ascending' | 'descending' {
  if (!active) return 'none'
  return dir === 'asc' ? 'ascending' : 'descending'
}

function HeaderCell<T>({
  column,
  sort,
  onSortChange,
}: {
  column: DataTableColumn<T>
  sort?: SortState | null
  onSortChange?: (key: string) => void
}) {
  const active = sort?.key === column.id
  const ariaSort = sortAria(active, sort?.dir)
  return (
    <TableHead scope="col" aria-sort={ariaSort} className={columnClass(column)}>
      <span className="inline-flex items-center gap-1">
        {column.sortable && onSortChange ? (
          <button
            type="button"
            onClick={() => onSortChange(column.id)}
            title={`Ordenar por ${typeof column.header === 'string' ? column.header : column.id}`}
            className={cn(
              'group inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              column.align === 'right' && 'flex-row-reverse',
            )}
          >
            {column.header}
            <SortIcon active={active} dir={sort?.dir} />
          </button>
        ) : (
          column.header
        )}
        {column.hint ? (
          <HintIcon hint={column.hint} label={column.header} />
        ) : null}
      </span>
    </TableHead>
  )
}

function BodyRow<T>({
  row,
  columns,
  getRowId,
  onRowClick,
}: {
  row: T
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
}) {
  return (
    <TableRow
      key={getRowId(row)}
      className={cn(onRowClick && 'cursor-pointer')}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
      {columns.map((column) => (
        <TableCell key={column.id} className={columnClass(column)}>
          {column.cell(row)}
        </TableCell>
      ))}
    </TableRow>
  )
}

/** Tabla de datos densa para escritorio, con filas navegables y orden opcional. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  sort,
  onSortChange,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <HeaderCell
                key={column.id}
                column={column}
                sort={sort}
                onSortChange={onSortChange}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <BodyRow
              key={getRowId(row)}
              row={row}
              columns={columns}
              getRowId={getRowId}
              onRowClick={onRowClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
