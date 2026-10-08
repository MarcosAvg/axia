import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import { adminMessages } from '../i18n'

interface RoleCreateFormProps {
  onCreate: (values: { name: string; label: string }) => void
  isSaving: boolean
}

/** Alta de un rol. */
export function RoleCreateForm({ onCreate, isSaving }: RoleCreateFormProps) {
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const { roles, actions } = adminMessages

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !label.trim()) return
    onCreate({ name: name.trim(), label: label.trim() })
    setName('')
    setLabel('')
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <TextField
          id="role-name"
          label={roles.name}
          className="min-h-11"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="w-56">
        <TextField
          id="role-label"
          label={roles.label}
          className="min-h-11"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={isSaving} className="min-h-11">
        {actions.add}
      </Button>
    </form>
  )
}
