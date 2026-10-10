import { EllipsisIcon, PencilIcon, PowerIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminMessages } from '../i18n'

interface RowActionsProps {
  active: boolean
  name: string
  editLabel?: string
  onEdit: () => void
  onToggle: () => void
}

/** Acciones de una fila en un menú compacto. */
export function RowActions({
  active,
  name,
  editLabel,
  onEdit,
  onToggle,
}: RowActionsProps) {
  const { actions } = adminMessages
  const toggleLabel = active ? actions.deactivate : actions.activate
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${editLabel ?? actions.edit}: ${name}`}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon />
          {editLabel ?? actions.edit}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggle}>
          <PowerIcon />
          {toggleLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
