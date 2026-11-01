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
  deleteLabel?: string
}

function DeleteMenuItem({
  label,
  onDelete,
}: {
  label: string
  onDelete: () => void
}) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2Icon />
        {label}
      </DropdownMenuItem>
    </>
  )
}

interface ActionsMenuProps {
  active: boolean
  editLabel?: string
  onEdit?: () => void
  onToggle: () => void
  onResetPassword?: () => void
  onRevokeSessions?: () => void
  onDelete?: () => void
  deleteLabel?: string
}

function ActionsMenu({
  active,
  editLabel,
  onEdit,
  onToggle,
  onResetPassword,
  onRevokeSessions,
  onDelete,
  deleteLabel,
}: ActionsMenuProps) {
  const { actions, users } = adminMessages
  return (
    <DropdownMenuContent align="end">
      {onEdit ? (
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon />
          {editLabel ?? actions.edit}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onSelect={onToggle}>
        <PowerIcon />
        {active ? actions.deactivate : actions.activate}
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
      {onDelete ? (
        <DeleteMenuItem
          label={deleteLabel ?? actions.delete}
          onDelete={onDelete}
        />
      ) : null}
    </DropdownMenuContent>
  )
}

/** Acciones de una fila en un menú compacto. */
export function RowActions(props: RowActionsProps) {
  const { name, editLabel } = props
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 lg:size-7"
          aria-label={`${editLabel ?? adminMessages.actions.edit}: ${name}`}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <ActionsMenu {...props} />
    </DropdownMenu>
  )
}
