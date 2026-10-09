import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/shared/form-fields'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ActionKey } from '../domain/actions'
import { actionsRequiringSubject, pickPrimaryAction } from '../domain/actions'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { ticketMessages } from '../i18n'
import { ActionContainer } from './action-container'
import { DEDICATED } from './ticket-action-handlers'

const ONE_CLICK: ActionKey[] = ['resume', 'validate']
/** Acciones que se separan al final por ser de descarte. */
const DESTRUCTIVE: ActionKey[] = ['reject', 'cancel', 'mark_duplicate']
const FORM_ACTIONS: ActionKey[] = [
  'start',
  'record_progress',
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

interface ActionControlsProps {
  visible: ActionKey[]
  oneClick: Partial<Record<ActionKey, () => void>>
  pending: Partial<Record<ActionKey, boolean>>
  blocked: ActionKey[]
  onOpenForm: (action: ActionKey) => void
}

function ActionControls({
  visible,
  oneClick,
  pending,
  blocked,
  onOpenForm,
}: ActionControlsProps) {
  const primary = pickPrimaryAction(visible)
  const others = visible.filter((action) => action !== primary)
  const normal = others.filter((action) => !DESTRUCTIVE.includes(action))
  const destructive = others.filter((action) => DESTRUCTIVE.includes(action))
  const run = (action: ActionKey) => () =>
    (oneClick[action] ?? (() => onOpenForm(action)))()
  const isDisabled = (action: ActionKey) =>
    Boolean(pending[action]) || blocked.includes(action)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary ? (
        <Button
          type="button"
          className="min-h-11"
          disabled={isDisabled(primary)}
          onClick={run(primary)}
        >
          {ticketMessages.actions[primary]}
        </Button>
      ) : null}
      {normal.map((action) => (
        <Button
          key={action}
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={isDisabled(action)}
          onClick={run(action)}
        >
          {ticketMessages.actions[action]}
        </Button>
      ))}
      {destructive.length > 0 ? (
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
      ) : null}
      {destructive.map((action) => (
        <Button
          key={action}
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={isDisabled(action)}
          onClick={run(action)}
        >
          {ticketMessages.actions[action]}
        </Button>
      ))}
    </div>
  )
}

function ProxySelector({
  participants,
  value,
  onChange,
}: {
  participants: TicketParticipant[]
  value: string
  onChange: (value: string) => void
}) {
  const seen = new Set<string>()
  const options = participants
    .filter((item) => {
      if (seen.has(item.technicianId)) return false
      seen.add(item.technicianId)
      return true
    })
    .map((item) => ({ value: item.technicianId, label: item.technicianName }))
  if (options.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <SelectField
        id="proxy-technician"
        label={ticketMessages.proxy.label}
        placeholder={ticketMessages.proxy.none}
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {ticketMessages.proxy.help}
      </p>
    </div>
  )
}

function ProxyRequiredHint({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {ticketMessages.proxy.required}
    </p>
  )
}

interface TicketActionsPanelProps {
  ticket: TicketDetail
  actions: ActionKey[]
  identity: Identity | null
  participants: TicketParticipant[]
}

/** Acciones disponibles según estado y permiso, con la primaria destacada. */
export function TicketActionsPanel({
  ticket,
  actions,
  identity,
  participants,
}: TicketActionsPanelProps) {
  const canProxy = can(identity, 'act_on_behalf')
  const [subjectTechnicianId, setSubject] = useState('')
  const [formAction, setFormAction] = useState<ActionKey | null>(null)
  const subject =
    canProxy && subjectTechnicianId ? subjectTechnicianId : undefined
  const mutations = useTicketActions(ticket.id, subject)

  const oneClick: Partial<Record<ActionKey, () => void>> = {
    resume: () => mutations.resume.mutate({}),
    validate: () => mutations.validate.mutate({}),
  }
  const pending: Partial<Record<ActionKey, boolean>> = {
    resume: mutations.resume.isPending,
    validate: mutations.validate.isPending,
  }

  const visible = actions.filter(
    (action) =>
      ONE_CLICK.includes(action) ||
      FORM_ACTIONS.includes(action) ||
      DEDICATED.includes(action),
  )
  if (visible.length === 0) return null
  const blocked = actionsRequiringSubject(identity, visible, Boolean(subject))
  const close = () => setFormAction(null)

  return (
    <div className="flex flex-col gap-4">
      {canProxy ? (
        <ProxySelector
          participants={participants}
          value={subjectTechnicianId}
          onChange={setSubject}
        />
      ) : null}
      <ActionControls
        visible={visible}
        oneClick={oneClick}
        pending={pending}
        blocked={blocked}
        onOpenForm={setFormAction}
      />
      <ProxyRequiredHint show={blocked.length > 0} />
      <ActionContainer
        ticket={ticket}
        formAction={formAction}
        subject={subject}
        onClose={close}
      />
    </div>
  )
}
