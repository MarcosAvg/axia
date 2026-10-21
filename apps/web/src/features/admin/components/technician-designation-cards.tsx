import { XIcon } from 'lucide-react'
import type { TechnicianDesignation } from '../domain/scope-list'
import { adminMessages } from '../i18n'

export function CategoryChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  const { scopes: t } = adminMessages
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
      {label}
      <button
        type="button"
        aria-label={`${t.remove}: ${label}`}
        className="relative inline-flex size-6 items-center justify-center rounded-full outline-none after:absolute after:-inset-2.5 after:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onRemove}
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}

export function DesignationCards({
  rows,
  technician,
  category,
  onRemove,
}: {
  rows: TechnicianDesignation[]
  technician: (id: string) => string
  category: (id: string) => string
  onRemove: (technicianId: string, categoryId: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {rows.map((designation) => (
        <li
          key={designation.technicianId}
          className="flex flex-col gap-3 rounded-xl border bg-card p-3"
        >
          <p className="font-medium">{technician(designation.technicianId)}</p>
          <div className="flex flex-wrap gap-1">
            {designation.categoryIds.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              designation.categoryIds.map((categoryId) => (
                <CategoryChip
                  key={categoryId}
                  label={category(categoryId)}
                  onRemove={() =>
                    onRemove(designation.technicianId, categoryId)
                  }
                />
              ))
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
