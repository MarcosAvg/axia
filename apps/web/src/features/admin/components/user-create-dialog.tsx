import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorAlert } from '@/components/shared/async-state'
import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/shared/form-fields'
import type { CreateUserInput } from '../api/users-api'
import type { Role } from '../domain/access'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

interface UserCreateDialogProps {
  roles: Role[]
  isSaving: boolean
  error?: string | null
  onCreate: (input: CreateUserInput) => void
  onClose: () => void
}

function AccountFields({
  username,
  fullName,
  onUsername,
  onFullName,
}: {
  username: string
  fullName: string
  onUsername: (value: string) => void
  onFullName: (value: string) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id="new-user-username"
        label={adminMessages.users.username}
        autoComplete="off"
        value={username}
        onChange={(event) => onUsername(event.target.value)}
      />
      <TextField
        id="new-user-full-name"
        label={adminMessages.fields.full_name}
        autoComplete="off"
        value={fullName}
        onChange={(event) => onFullName(event.target.value)}
      />
    </div>
  )
}

function RoleCheckboxes({
  roles,
  selected,
  onToggle,
}: {
  roles: Role[]
  selected: string[]
  onToggle: (roleId: string, checked: boolean) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {roles.map((role) => {
        const id = `new-user-role-${role.id}`
        return (
          <label
            key={role.id}
            htmlFor={id}
            className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"
          >
            <Checkbox
              id={id}
              checked={selected.includes(role.id)}
              onCheckedChange={(value) => onToggle(role.id, value === true)}
            />
            {role.label}
          </label>
        )
      })}
    </div>
  )
}

function UserCreateForm({
  roles,
  isSaving,
  error,
  onCreate,
  onClose,
}: UserCreateDialogProps) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [validation, setValidation] = useState<string | null>(null)
  const canSubmit =
    username.trim().length >= 3 &&
    fullName.trim().length > 0 &&
    roleIds.length > 0

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) {
      setValidation(adminMessages.users.requiredFields)
      return
    }
    onCreate({
      username: username.trim(),
      fullName: fullName.trim(),
      roleIds,
    })
  }

  return (
    <EntityForm
      onSubmit={submit}
      onCancel={onClose}
      isSaving={isSaving}
      submitLabel={adminMessages.users.createSubmit}
    >
      <FormGroup title={adminMessages.users.accountSection}>
        <AccountFields
          username={username}
          fullName={fullName}
          onUsername={setUsername}
          onFullName={setFullName}
        />
      </FormGroup>
      <FormGroup title={adminMessages.users.roles}>
        <RoleCheckboxes
          roles={roles.filter((role) => role.active)}
          selected={roleIds}
          onToggle={(roleId, checked) =>
            setRoleIds((current) =>
              checked
                ? [...current, roleId]
                : current.filter((id) => id !== roleId),
            )
          }
        />
      </FormGroup>
      {validation ? <ErrorAlert message={validation} /> : null}
      {error ? <ErrorAlert message={error} /> : null}
    </EntityForm>
  )
}

/** Alta de una cuenta con roles iniciales y contraseña temporal. */
export function UserCreateDialog(props: UserCreateDialogProps) {
  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={adminMessages.users.createTitle}
      description={adminMessages.users.createHelp}
    >
      <UserCreateForm {...props} />
    </EntityDialog>
  )
}
