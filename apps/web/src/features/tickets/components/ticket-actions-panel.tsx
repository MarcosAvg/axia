import { Button } from '@/components/ui/button'
import { ButtonGrid } from '@/components/shared/button-grid'
import type { Identity } from '@/features/auth'
import { actionEmphasis } from '../domain/action-emphasis'
import type { ActionEmphasis } from '../domain/action-emphasis'
import type { ActionKey } from '../domain/actions'
import { pickPrimaryAction } from '../domain/actions'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { useActionPanel } from '../hooks/use-action-panel'
import { ticketMessages } from '../i18n'
import { ActionContainer } from './action-container'
import { ProxyRequiredHint, ProxySelector } from './proxy-fields'
import { TakeOfferBanner } from './take-offer-banner'

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

export interface TicketActionsPanelProps {
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
  const panel = useActionPanel(ticket, actions, identity, participants)
  if (panel.visible.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {ticket.status === 'registered' && panel.hasOffer ? (
        <TakeOfferBanner
          pending={panel.mutations.take.isPending}
          onTake={() => panel.mutations.take.mutate({})}
        />
      ) : null}
      {panel.canProxy ? (
        <ProxySelector
          participants={participants}
          value={panel.subjectTechnicianId}
          onChange={panel.setSubject}
        />
      ) : null}
      <ActionControls
        visible={panel.visible}
        oneClick={panel.oneClick}
        pending={panel.pending}
        blocked={panel.blocked}
        onOpenForm={panel.setFormAction}
      />
      <ProxyRequiredHint show={panel.blocked.length > 0} />
      <ActionContainer
        ticket={ticket}
        formAction={panel.formAction}
        subject={panel.subject}
        excludeIds={panel.activeIds}
        onClose={panel.close}
      />
    </div>
  )
}
