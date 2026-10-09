import type { ReactNode } from 'react'
import { cn } from 'cn'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Clase aplicada a la celda y a su encabezado. */
  className?: string
  /** Oculta la columna por debajo del punto de quiebre indicado. */
  hideBelow?: 'sm' | 'md' | 'lg'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
}

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const

function headerClass<T>(column: DataTableColumn<T>): string | undefined {
  return cn(
    column.hideBelow ? hideClasses[column.hideBelow] : undefined,
    column.className,
  )
}

function cellClass<T>(column: DataTableColumn<T>): string | undefined {
  return cn(
    column.hideBelow ? hideClasses[column.hideBelow] : undefined,
    column.className,
  )
}

/** Tabla de datos densa para escritorio, con filas navegables por teclado. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={headerClass(column)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowId(row)}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter') onRowClick(row)
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <TableCell key={column.id} className={cellClass(column)}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
