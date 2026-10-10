import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
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
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={adminMessages.roles.createTitle}
      description={adminMessages.roles.createHelp}
    >
      <RoleCreateForm
        onCreate={onCreate}
        isSaving={isSaving}
        onClose={onClose}
      />
    </EntityDialog>
  )
}
