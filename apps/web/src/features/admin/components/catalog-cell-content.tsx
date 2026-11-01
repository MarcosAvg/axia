import { Badge } from '@/components/ui/badge'
import { cn } from 'cn'
import type { AdminTable } from '../api/admin-api'
import { cellText } from '../domain/catalog-cell'
import type { AdminColumn } from '../domain/catalogs'
import { adminMessages } from '../i18n'

interface CellContentProps {
  row: Record<string, unknown>
  column: AdminColumn
  optionsFor: (table: AdminTable) => { id: string; label: string }[]
}

/** Valor visible de una celda: etiquetas resueltas, guion para vacíos y cuenta vinculada. */
export function CellContent({ row, column, optionsFor }: CellContentProps) {
  const text = cellText(column, row, optionsFor)
  if (!text) return <span className="text-muted-foreground">—</span>
  if (column.format === 'account') {
    const isInactive = row.user_active === false
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className={cn('truncate', column.truncate && 'max-w-56')}>
          {text}
        </span>
        {isInactive ? (
          <Badge variant="outline">{adminMessages.list.inactive}</Badge>
        ) : null}
      </span>
    )
  }
  if (column.truncate) {
    return (
      <span className="block max-w-56 truncate" title={text}>
        {text}
      </span>
    )
  }
  return <span>{text}</span>
}
