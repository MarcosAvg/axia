import { useState } from 'react'
import type { FormEvent } from 'react'
import { SelectField } from '@/components/shared/form-fields'
import type { AdminRow } from '../api/admin-api'
import type { Profile } from '../domain/access'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

interface ScopeFieldsProps {
  profiles: Profile[]
  teams: AdminRow[]
  userId: string
  teamId: string
  onChange: (patch: { userId?: string; teamId?: string }) => void
}

function ScopeFields({
  profiles,
  teams,
  userId,
  teamId,
  onChange,
}: ScopeFieldsProps) {
  const { scopes: t, actions } = adminMessages
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id="scope-user"
        label={t.user}
        placeholder={actions.selectPlaceholder}
        options={profiles.map((profile) => ({
          value: profile.id,
          label: profile.fullName,
        }))}
        value={userId}
        onChange={(event) => onChange({ userId: event.target.value })}
      />
      <SelectField
        id="scope-team"
        label={t.team}
        placeholder={actions.selectPlaceholder}
        options={teams.map((team) => ({
          value: String(team.id),
          label: String(team.name),
        }))}
        value={teamId}
        onChange={(event) => onChange({ teamId: event.target.value })}
      />
    </div>
  )
}

interface SupervisorScopeDialogProps {
  profiles: Profile[]
  teams: AdminRow[]
  isSaving: boolean
  onCreate: (userId: string, teamId: string) => void
  onClose: () => void
}

/** Alta de un ámbito de supervisor (usuario y equipo). */
export function SupervisorScopeDialog({
  profiles,
  teams,
  isSaving,
  onCreate,
  onClose,
}: SupervisorScopeDialogProps) {
  const [values, setValues] = useState({ userId: '', teamId: '' })
  const { scopes: t, actions } = adminMessages

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.userId || !values.teamId) return
    onCreate(values.userId, values.teamId)
    onClose()
  }

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t.addSupervisor}
      description={t.addSupervisorHelp}
    >
      <EntityForm
        onSubmit={submit}
        onCancel={onClose}
        isSaving={isSaving}
        submitLabel={actions.add}
      >
        <FormGroup title={t.supervisor}>
          <ScopeFields
            profiles={profiles}
            teams={teams}
            userId={values.userId}
            teamId={values.teamId}
            onChange={(patch) =>
              setValues((current) => ({ ...current, ...patch }))
            }
          />
        </FormGroup>
      </EntityForm>
    </EntityDialog>
  )
}
