import { SelectField, TextAreaField } from '@/components/shared/form-fields'
import type { Option, ReasonOption } from '@/features/catalogs'
import type { SupervisorOption } from '../domain/types'
import { ticketMessages } from '../i18n'

const MODE_OPTIONS = [
  { value: 'team', label: ticketMessages.actionFields.toTeam },
  { value: 'supervisor', label: ticketMessages.actionFields.toSupervisor },
]

interface DestinationFieldProps {
  mode: string
  onMode: (mode: string) => void
  teamId: string
  onTeam: (id: string) => void
  supervisorId: string
  onSupervisor: (id: string) => void
  teams: Option[]
  supervisors: SupervisorOption[]
}

function DestinationField({
  mode,
  onMode,
  teamId,
  onTeam,
  supervisorId,
  onSupervisor,
  teams,
  supervisors,
}: DestinationFieldProps) {
  const { actionFields, create } = ticketMessages
  const toTeam = mode === 'team'
  const placeholder = create.fields.selectPlaceholder

  return (
    <>
      <SelectField
        id="assign-supervisor-mode"
        label={actionFields.destination}
        options={MODE_OPTIONS}
        value={mode}
        onChange={(event) => onMode(event.target.value)}
      />
      {toTeam ? (
        <SelectField
          id="assign-supervisor-team"
          label={actionFields.team}
          placeholder={placeholder}
          options={teams.map((team) => ({ value: team.id, label: team.name }))}
          value={teamId}
          onChange={(event) => onTeam(event.target.value)}
        />
      ) : (
        <SelectField
          id="assign-supervisor-user"
          label={actionFields.supervisor}
          placeholder={placeholder}
          options={supervisors.map((person) => ({
            value: person.id,
            label: person.fullName,
          }))}
          value={supervisorId}
          onChange={(event) => onSupervisor(event.target.value)}
        />
      )}
    </>
  )
}

interface AssignSupervisorFieldsProps extends DestinationFieldProps {
  reasonId: string
  onReason: (id: string) => void
  note: string
  onNote: (note: string) => void
  reasons: ReasonOption[]
}

/** Campos de la reasignación de supervisor. */
export function AssignSupervisorFields({
  reasonId,
  onReason,
  note,
  onNote,
  reasons,
  ...destination
}: AssignSupervisorFieldsProps) {
  const { actionFields, create } = ticketMessages

  return (
    <>
      <DestinationField {...destination} />
      <SelectField
        id="assign-supervisor-reason"
        label={actionFields.reason}
        placeholder={create.fields.selectPlaceholder}
        options={reasons.map((reason) => ({
          value: reason.id,
          label: reason.name,
        }))}
        value={reasonId}
        onChange={(event) => onReason(event.target.value)}
      />
      <TextAreaField
        id="assign-supervisor-note"
        label={actionFields.note}
        rows={2}
        value={note}
        onChange={(event) => onNote(event.target.value)}
      />
    </>
  )
}
