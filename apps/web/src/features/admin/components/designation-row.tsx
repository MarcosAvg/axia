import { TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TechnicianCategory } from '../domain/access'
import { adminMessages } from '../i18n'

interface DesignationRowProps {
  designation: TechnicianCategory
  technicianName: string
  categoryName: string
  onRemove: () => void
}

/** Fila de una designación: técnico y categoría. */
export function DesignationRow({
  technicianName,
  categoryName,
  onRemove,
}: DesignationRowProps) {
  const { scopes: t } = adminMessages

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
      <span>
        {technicianName}
        {' · '}
        {categoryName}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${t.remove}: ${technicianName}`}
        onClick={onRemove}
      >
        <TrashIcon />
      </Button>
    </li>
  )
}
