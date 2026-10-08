import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ActionKey } from '../domain/actions'
import type { TicketDetail } from '../domain/types'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { ticketMessages } from '../i18n'
import { DuplicateForm } from './duplicate-form'
import { RecaptureForm } from './recapture-form'
import { AssignSupervisorForm } from './assign-supervisor-form'
import { TicketActionForm } from './ticket-action-form'

const ONE_CLICK: ActionKey[] = ['start', 'resume', 'validate']
const FORM_ACTIONS: ActionKey[] = [
  'assign_technician',
  'add_auxiliary',
  'pause',
  'reject',
  'cancel',
  'change_priority',
  'attend',
  'comment',
  'open_claim',
  'resolve_claim',
  'reactivate',
]
const DEDICATED: ActionKey[] = [
  'recapture',
  'mark_duplicate',
  'assign_supervisor',
]

interface TicketActionsPanelProps {
  ticket: TicketDetail
  actions: ActionKey[]
}

/** Botonera de acciones disponibles; cada una abre su formulario. */
export function TicketActionsPanel({
  ticket,
  actions,
}: TicketActionsPanelProps) {
  const mutations = useTicketActions(ticket.id)
  const [formAction, setFormAction] = useState<ActionKey | null>(null)

  const oneClick: Partial<Record<ActionKey, () => void>> = {
    start: () => mutations.start.mutate({}),
    resume: () => mutations.resume.mutate({}),
    validate: () => mutations.validate.mutate({}),
  }

  const visible = actions.filter(
    (action) =>
      ONE_CLICK.includes(action) ||
      FORM_ACTIONS.includes(action) ||
      DEDICATED.includes(action),
  )
  if (visible.length === 0) return null

  const close = () => setFormAction(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {visible.map((action) => {
          const handler = oneClick[action]
          return (
            <Button
              key={action}
              type="button"
              variant={handler ? 'secondary' : 'outline'}
              className="min-h-11"
              onClick={handler ?? (() => setFormAction(action))}
            >
              {ticketMessages.actions[action]}
            </Button>
          )
        })}
      </div>
      {formAction === 'recapture' ? (
        <RecaptureForm ticket={ticket} onClose={close} />
      ) : null}
      {formAction === 'mark_duplicate' ? (
        <DuplicateForm ticketId={ticket.id} onClose={close} />
      ) : null}
      {formAction === 'assign_supervisor' ? (
        <AssignSupervisorForm ticketId={ticket.id} onClose={close} />
      ) : null}
      {formAction && !DEDICATED.includes(formAction) ? (
        <TicketActionForm
          ticketId={ticket.id}
          action={formAction}
          onClose={close}
        />
      ) : null}
    </div>
  )
}
