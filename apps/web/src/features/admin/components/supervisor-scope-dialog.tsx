import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { SelectField } from '@/components/shared/form-fields'
import type { AdminRow } from '../api/admin-api'
import type { Profile, SupervisorScope } from '../domain/access'
import { adminMessages } from '../i18n'
import { AssignmentDialog } from './assignment-dialog'
import { AssignmentOptions } from './assignment-options'

const { scopes: t, actions } = adminMessages
const schema = z.object({
  userId: z.uuid(t.selectSupervisor),
  teamId: z.uuid(t.selectTeam),
  buildingIds: z.array(z.uuid()),
})

interface SupervisorScopeDialogProps {
  profiles: Profile[]
  teams: AdminRow[]
  buildings: AdminRow[]
  scopes: SupervisorScope[]
  editing?: SupervisorScope
  description: string
  isSaving: boolean
  onSave: (values: z.infer<typeof schema>) => void
  onClose: () => void
}

type ScopeForm = ReturnType<typeof useForm<z.infer<typeof schema>>>

function ScopeFields({
  form,
  model,
}: {
  form: ScopeForm
  model: SupervisorScopeDialogProps
}) {
  const userId = useWatch({ control: form.control, name: 'userId' })
  const teamId = useWatch({ control: form.control, name: 'teamId' })
  const { errors } = form.formState

  function select(nextUserId: string, nextTeamId: string) {
    const existing = model.scopes.find(
      (scope) => scope.userId === nextUserId && scope.teamId === nextTeamId,
    )
    form.setValue('userId', nextUserId, {
      shouldValidate: Boolean(errors.userId),
    })
    form.setValue('teamId', nextTeamId, {
      shouldValidate: Boolean(errors.teamId),
    })
    form.setValue('buildingIds', existing?.buildingIds ?? [])
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id="scope-user"
        label={t.user}
        placeholder={
          model.profiles.length ? actions.selectPlaceholder : t.noSupervisors
        }
        options={model.profiles.map((profile) => ({
          value: profile.id,
          label: profile.fullName,
        }))}
        value={userId}
        disabled={model.isSaving}
        error={errors.userId?.message}
        onChange={(event) => select(event.target.value, teamId)}
      />
      <SelectField
        id="scope-team"
        label={t.team}
        placeholder={actions.selectPlaceholder}
        options={model.teams.map((team) => ({
          value: String(team.id),
          label: String(team.name),
        }))}
        value={teamId}
        disabled={model.isSaving}
        error={errors.teamId?.message}
        onChange={(event) => select(userId, event.target.value)}
      />
    </div>
  )
}

export function SupervisorScopeDialog(model: SupervisorScopeDialogProps) {
  const { editing, buildings, description, isSaving, onSave, onClose } = model
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          userId: editing.userId,
          teamId: editing.teamId,
          buildingIds: editing.buildingIds,
        }
      : { userId: '', teamId: '', buildingIds: [] },
  })
  const buildingIds = useWatch({ control: form.control, name: 'buildingIds' })
  const userId = useWatch({ control: form.control, name: 'userId' })
  const teamId = useWatch({ control: form.control, name: 'teamId' })

  return (
    <AssignmentDialog
      title={editing ? t.editBuildings : t.addSupervisor}
      description={description}
      isSaving={isSaving}
      onSave={form.handleSubmit(onSave)}
      onClose={onClose}
    >
      {editing ? null : <ScopeFields form={form} model={model} />}
      <AssignmentOptions
        kind="buildings"
        rows={buildings}
        value={buildingIds}
        onChange={(ids) => form.setValue('buildingIds', ids)}
        disabled={isSaving || !userId || !teamId}
      />
    </AssignmentDialog>
  )
}
