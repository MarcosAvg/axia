import { XIcon } from 'lucide-react'

export interface FilterChip {
  key: string
  label: string
  onRemove: () => void
}

interface FilterChipsProps {
  items: FilterChip[]
  removeLabel: string
  clearLabel: string
  onClear: () => void
}

/** Chips de filtros activos, con quitar individual y limpiar todo. */
export function FilterChips({
  items,
  removeLabel,
  clearLabel,
  onClear,
}: FilterChipsProps) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
        >
          {item.label}
          <button
            type="button"
            aria-label={`${removeLabel} ${item.label}`}
            onClick={item.onRemove}
            className="rounded-full p-0.5 hover:bg-background/60"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {clearLabel}
      </button>
    </div>
  )
}
