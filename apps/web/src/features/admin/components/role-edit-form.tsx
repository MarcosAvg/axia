import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TextField } from '@/components/shared/form-fields'
import type { Role } from '../domain/access'
import { adminMessages } from '../i18n'

interface RoleEditFormProps {
  role: Role
  onSave: (values: { label: string; active: boolean }) => void
  isSaving: boolean
}

/** Edición de la etiqueta y el estado de un rol (se remonta al cambiar de rol). */
export function RoleEditForm({ role, onSave, isSaving }: RoleEditFormProps) {
  const [label, setLabel] = useState(role.label)
  const [active, setActive] = useState(role.active)
  const { roles, fields, actions } = adminMessages

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ label: label.trim() || role.label, active })
      }}
      className="flex flex-wrap items-end gap-4"
    >
      <div className="w-full max-w-sm">
        <TextField
          id="role-edit-label"
          label={roles.label}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Switch
          checked={active}
          aria-label={fields.active}
          onCheckedChange={setActive}
        />
        {fields.active}
      </label>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? actions.saving : actions.save}
      </Button>
    </form>
  )
}
