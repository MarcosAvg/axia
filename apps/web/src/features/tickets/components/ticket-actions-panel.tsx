import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ActionKey } from '../domain/actions'
import { ticketMessages } from '../i18n'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { TicketActionForm } from './ticket-action-form'

const ONE_CLICK: ActionKey[] = ['start', 'resume', 'validate']
const FORM_ACTIONS: ActionKey[] = [
  'assign_technician',
  'pause',
  'reject',
  'cancel',
  'change_priority',
  'attend',
  'comment',
]

interface TicketActionsPanelProps {
  ticketId: string
  actions: ActionKey[]
}

/** Botonera de acciones disponibles; las que piden datos abren su formulario. */
export function TicketActionsPanel({
  ticketId,
  actions,
}: TicketActionsPanelProps) {
  const mutations = useTicketActions(ticketId)
  const [formAction, setFormAction] = useState<ActionKey | null>(null)

  const oneClick: Partial<Record<ActionKey, () => void>> = {
    start: () => mutations.start.mutate(undefined),
    resume: () => mutations.resume.mutate(undefined),
    validate: () => mutations.validate.mutate(undefined),
  }

  const visible = actions.filter(
    (action) => ONE_CLICK.includes(action) || FORM_ACTIONS.includes(action),
  )
  if (visible.length === 0) return null

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
      {formAction ? (
        <TicketActionForm
          ticketId={ticketId}
          action={formAction}
          onClose={() => setFormAction(null)}
        />
      ) : null}
    </div>
  )
}
