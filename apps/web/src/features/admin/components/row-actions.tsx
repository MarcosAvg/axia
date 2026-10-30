import {
  EllipsisIcon,
  KeyRoundIcon,
  LogOutIcon,
  PencilIcon,
  PowerIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminMessages } from '../i18n'

interface RowActionsProps {
  active: boolean
  name: string
  editLabel?: string
  onEdit?: () => void
  onToggle: () => void
  onResetPassword?: () => void
  onRevokeSessions?: () => void
  onDelete?: () => void
}

function DeleteMenuItem({ onDelete }: { onDelete: () => void }) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2Icon />
        {adminMessages.users.deleteUser}
      </DropdownMenuItem>
    </>
  )
}

/** Acciones de una fila en un menú compacto. */
export function RowActions({
  active,
  name,
  editLabel,
  onEdit,
  onToggle,
  onResetPassword,
  onRevokeSessions,
  onDelete,
}: RowActionsProps) {
  const { actions, users } = adminMessages
  const toggleLabel = active ? actions.deactivate : actions.activate
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 lg:size-7"
          aria-label={`${editLabel ?? actions.edit}: ${name}`}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? (
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon />
            {editLabel ?? actions.edit}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onToggle}>
          <PowerIcon />
          {toggleLabel}
        </DropdownMenuItem>
        {onResetPassword ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onResetPassword}>
              <KeyRoundIcon />
              {users.resetPassword}
            </DropdownMenuItem>
          </>
        ) : null}
        {onRevokeSessions ? (
          <DropdownMenuItem onSelect={onRevokeSessions}>
            <LogOutIcon />
            {users.revokeSessions}
          </DropdownMenuItem>
        ) : null}
        {onDelete ? <DeleteMenuItem onDelete={onDelete} /> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
