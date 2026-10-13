import type { ReactNode } from 'react'
import { cn } from 'cn'

const COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

/**
 * Fila de botones de acción: **rejilla en móvil** (dos columnas por defecto) y fila
 * que se envuelve a partir de `sm`. Un hijo con `col-span-2` ocupa todo el ancho en
 * móvil (sin efecto en la fila de escritorio).
 */
export function ButtonGrid({
  columns = 2,
  className,
  children,
}: {
  columns?: number
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid gap-2 sm:flex sm:flex-wrap sm:items-center',
        COLUMNS[columns] ?? COLUMNS[2],
        className,
      )}
    >
      {children}
    </div>
  )
}
