import type { FormEventHandler, ReactNode } from 'react'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'

interface AssignmentDialogProps {
  title: string
  description: string
  isSaving: boolean
  onSave: FormEventHandler<HTMLFormElement>
  onClose: () => void
  children: ReactNode
}

export function AssignmentDialog({
  title,
  description,
  isSaving,
  onSave,
  onClose,
  children,
}: AssignmentDialogProps) {
  function close() {
    if (!isSaving) onClose()
  }

  return (
    <EntityDialog
      open
      onOpenChange={close}
      title={title}
      description={description}
    >
      <EntityForm
        onSubmit={onSave}
        onCancel={close}
        isSaving={isSaving}
        submitLabel={adminMessages.scopes.saveChanges}
      >
        {children}
      </EntityForm>
    </EntityDialog>
  )
}
