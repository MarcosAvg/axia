import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { fieldSelectClass } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import type { SortState } from '@/lib/sort'
import type { AdminColumn } from '../domain/catalogs'
import { adminMessages } from '../i18n'

interface CatalogSortControlProps {
  columns: AdminColumn[]
  sort: SortState | null
  onSelect: (key: string) => void
  onToggleDirection: () => void
}

/**
 * Orden para pantallas angostas: la cabecera de la tabla no está disponible en
 * la vista de tarjetas, así que se elige la columna y la dirección aquí.
 */
export function CatalogSortControl({
  columns,
  sort,
  onSelect,
  onToggleDirection,
}: CatalogSortControlProps) {
  const { list } = adminMessages
  const isDescending = sort?.dir === 'desc'
  return (
    <div className="flex flex-wrap items-center gap-2 lg:hidden">
      <label htmlFor="catalog-sort" className="text-sm text-muted-foreground">
        {list.sortBy}
      </label>
      <select
        id="catalog-sort"
        className={`${fieldSelectClass} min-h-11 w-auto flex-1`}
        value={sort?.key ?? ''}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">{list.defaultOrder}</option>
        {columns.map((column) => (
          <option key={column.key} value={column.key}>
            {column.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label={isDescending ? list.ascending : list.descending}
        title={isDescending ? list.ascending : list.descending}
        disabled={!sort}
        onClick={onToggleDirection}
      >
        {isDescending ? <ArrowDownIcon /> : <ArrowUpIcon />}
      </Button>
    </div>
  )
}
