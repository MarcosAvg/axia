import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGrid } from '@/components/shared/button-grid'
import { SelectField } from '@/components/shared/form-fields'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ActionKey } from '../domain/actions'
import { actionsRequiringSubject, pickPrimaryAction } from '../domain/actions'
import { actionEmphasis } from '../domain/action-emphasis'
import type { ActionEmphasis } from '../domain/action-emphasis'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { useMyOffers } from '../hooks/use-tickets'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { ticketMessages } from '../i18n'
import { ActionContainer } from './action-container'
import { DEDICATED } from './ticket-action-handlers'

const ONE_CLICK: ActionKey[] = ['validate']
const FORM_ACTIONS: ActionKey[] = [
  'start',
  'record_progress',
  'assign_technician',
  'add_auxiliary',
  'pause',
  'advance_pause',
  'resume',
  'reject',
  'cancel',
  'change_priority',
  'attend',
  'comment',
  'open_claim',
  'resolve_claim',
  'reactivate',
]

/** Variante del botón para cada énfasis (tinte suave; ver `domain/action-emphasis`). */
const EMPHASIS_VARIANT = {
  primary: 'default',
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'destructive',
  neutral: 'outline',
} as const satisfies Record<ActionEmphasis, string>

interface ActionControlsProps {
  visible: ActionKey[]
  oneClick: Partial<Record<ActionKey, () => void>>
  pending: Partial<Record<ActionKey, boolean>>
  blocked: ActionKey[]
  onOpenForm: (action: ActionKey) => void
}

type ActionButtonVariant = (typeof EMPHASIS_VARIANT)[ActionEmphasis]

function ActionButton({
  action,
  variant,
  className,
  disabled,
  onClick,
}: {
  action: ActionKey
  variant: ActionButtonVariant
  className: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {ticketMessages.actions[action]}
    </Button>
  )
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
  const dangerous = others.filter(
    (action) => actionEmphasis(action) === 'danger',
  )
  const normal = others.filter((action) => actionEmphasis(action) !== 'danger')
  const run = (action: ActionKey) => () =>
    (oneClick[action] ?? (() => onOpenForm(action)))()
  const disabled = (action: ActionKey) =>
    Boolean(pending[action]) || blocked.includes(action)

  return (
    <ButtonGrid>
      {primary ? (
        <ActionButton
          action={primary}
          variant={
            actionEmphasis(primary) === 'danger' ? 'destructive' : 'default'
          }
          className="col-span-2 min-h-11"
          disabled={disabled(primary)}
          onClick={run(primary)}
        />
      ) : null}
      {normal.map((action) => (
        <ActionButton
          key={action}
          action={action}
          variant={EMPHASIS_VARIANT[actionEmphasis(action)]}
          className="min-h-11"
          disabled={disabled(action)}
          onClick={run(action)}
        />
      ))}
      {dangerous.length > 0 ? (
        <span
          aria-hidden
          className="col-span-2 h-px bg-border sm:col-auto sm:mx-1 sm:h-6 sm:w-px"
        />
      ) : null}
      {dangerous.map((action) => (
        <ActionButton
          key={action}
          action={action}
          variant="destructive"
          className="min-h-11"
          disabled={disabled(action)}
          onClick={run(action)}
        />
      ))}
    </ButtonGrid>
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

function useAutoTakeOffer(
  ticket: TicketDetail,
  userId: string | undefined,
  take: ReturnType<typeof useTicketActions>['take'],
) {
  const offers = useMyOffers(userId)
  const hasOffer = Boolean(offers.data?.some((offer) => offer.id === ticket.id))
  const took = useRef(false)
  useEffect(() => {
    if (took.current) return
    if (ticket.status === 'registered' && hasOffer) {
      took.current = true
      take.mutate({})
    }
  }, [ticket.status, hasOffer, take])
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

  // Al abrir el detalle, el supervisor con oferta activa toma el tiquet.
  useAutoTakeOffer(ticket, identity?.userId, mutations.take)

  const oneClick: Partial<Record<ActionKey, () => void>> = {
    validate: () => mutations.validate.mutate({}),
  }
  const pending: Partial<Record<ActionKey, boolean>> = {
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
  const activeIds = participants
    .filter((item) => item.endedAt === null)
    .map((item) => item.technicianId)
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
        excludeIds={activeIds}
        onClose={close}
      />
    </div>
  )
}
