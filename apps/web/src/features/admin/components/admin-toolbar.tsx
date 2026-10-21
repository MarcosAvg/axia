import { PlusIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminMessages } from '../i18n'

interface AdminToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder?: string
  countText?: string
  addLabel?: string
  onAdd?: () => void
}

/** Barra de lista: buscador a la izquierda, contador y acción primaria a la derecha. */
export function AdminToolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  countText,
  addLabel,
  onAdd,
}: AdminToolbarProps) {
  const placeholder = searchPlaceholder ?? adminMessages.list.search
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-h-11 pl-9"
        />
      </div>
      <div className="flex items-center gap-3">
        {countText ? (
          <span className="text-sm text-muted-foreground">{countText}</span>
        ) : null}
        {addLabel && onAdd ? (
          <Button type="button" className="min-h-11" onClick={onAdd}>
            <PlusIcon />
            {addLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
