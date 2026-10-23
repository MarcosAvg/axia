import { ErrorAlert } from '@/components/shared/async-state'
import { ButtonGrid } from '@/components/shared/button-grid'
import { Button } from '@/components/ui/button'
import { toTicketError } from '../domain/errors'
import { useAssignSupervisorForm } from '../hooks/use-assign-supervisor-form'
import { ticketMessages } from '../i18n'
import { ActionTimeField } from './action-time-field'
import { AssignSupervisorFields } from './assign-supervisor-fields'

/** Reasignar supervisor: a otro equipo (re-rutea) o a un supervisor concreto. */
export function AssignSupervisorForm({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const form = useAssignSupervisorForm(ticketId, onClose)
  const { actionFields } = ticketMessages

  return (
    <form onSubmit={form.submit} className="flex flex-col gap-4">
      {form.time.show ? (
        <ActionTimeField
          value={form.time.value}
          onChange={form.time.setValue}
        />
      ) : null}
      <AssignSupervisorFields
        mode={form.mode}
        onMode={form.setMode}
        teamId={form.teamId}
        onTeam={form.setTeamId}
        supervisorId={form.supervisorId}
        onSupervisor={form.setSupervisorId}
        reasonId={form.reasonId}
        onReason={form.setReasonId}
        note={form.note}
        onNote={form.setNote}
        teams={form.teams}
        supervisors={form.supervisors}
        reasons={form.reasons}
      />
      {form.error ? (
        <ErrorAlert message={toTicketError(form.error).message} />
      ) : null}
      <ButtonGrid>
        <Button type="submit" disabled={form.isPending} className="min-h-11">
          {actionFields.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onClose}
        >
          {actionFields.cancel}
        </Button>
      </ButtonGrid>
    </form>
  )
}
