import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
      className="flex flex-wrap items-end gap-3"
    >
      <div className="w-56">
        <TextField
          id="role-edit-label"
          label={roles.label}
          className="min-h-11"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        {fields.active}
      </label>
      <Button type="submit" disabled={isSaving} className="min-h-11">
        {actions.save}
      </Button>
    </form>
  )
}
