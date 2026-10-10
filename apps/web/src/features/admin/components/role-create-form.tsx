import { useState } from 'react'
import type { FormEvent } from 'react'
import { TextField } from '@/components/shared/form-fields'
import { adminMessages } from '../i18n'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

interface RoleCreateFormProps {
  onCreate: (values: { name: string; label: string }) => void
  isSaving: boolean
  onClose?: () => void
}

/** Alta de un rol. */
export function RoleCreateForm({
  onCreate,
  isSaving,
  onClose,
}: RoleCreateFormProps) {
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const { roles, actions } = adminMessages

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !label.trim()) return
    onCreate({ name: name.trim(), label: label.trim() })
    setName('')
    setLabel('')
    onClose?.()
  }

  return (
    <EntityForm
      onSubmit={submit}
      onCancel={() => onClose?.()}
      isSaving={isSaving}
      submitLabel={actions.add}
    >
      <FormGroup title={roles.createTitle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="role-name"
            label={roles.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            id="role-label"
            label={roles.label}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
      </FormGroup>
    </EntityForm>
  )
}
