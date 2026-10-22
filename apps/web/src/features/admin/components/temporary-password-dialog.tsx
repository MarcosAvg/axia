import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { adminMessages } from '../i18n'

interface TemporaryPasswordDialogProps {
  open: boolean
  mode: 'created' | 'reset'
  username: string
  password: string
  onClose: () => void
}

/** Muestra una contraseña temporal una sola vez, sin persistirla. */
export function TemporaryPasswordDialog({
  open,
  mode,
  username,
  password,
  onClose,
}: TemporaryPasswordDialogProps) {
  const title =
    mode === 'created'
      ? adminMessages.users.passwordCreatedTitle
      : adminMessages.users.passwordResetTitle

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      toast.success(adminMessages.users.passwordCopied)
    } catch {
      toast.error(adminMessages.actions.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {username} · {adminMessages.users.passwordHelp}
          </DialogDescription>
        </DialogHeader>
        <code className="block rounded-lg border bg-muted p-3 font-mono text-sm break-all">
          {password}
        </code>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onClose}
          >
            {adminMessages.actions.close}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => void copy()}
          >
            <CopyIcon />
            {adminMessages.users.copyPassword}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
