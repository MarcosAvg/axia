import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { adminMessages } from '../i18n'
import { RoleCreateForm } from './role-create-form'

interface RoleCreateDialogProps {
  onCreate: (values: { name: string; label: string }) => void
  isSaving: boolean
  onClose: () => void
}

/** Modal de alta de un rol. */
export function RoleCreateDialog({
  onCreate,
  isSaving,
  onClose,
}: RoleCreateDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{adminMessages.roles.createTitle}</DialogTitle>
        </DialogHeader>
        <RoleCreateForm
          onCreate={onCreate}
          isSaving={isSaving}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
