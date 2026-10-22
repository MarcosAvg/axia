import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/shared/form-fields'
import { can, type Identity } from '@/features/auth'
import type { ActionKey } from '../domain/actions'
import { actionsRequiringSubject } from '../domain/actions'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { useMyOffers } from '../hooks/use-tickets'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { ticketMessages } from '../i18n'
import { ActionContainer } from './action-container'
import { ActionControls } from './ticket-action-controls'
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
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3">
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

function TakeOfferBanner({
  pending,
  onTake,
}: {
  pending: boolean
  onTake: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">
          Tienes una oferta para este tiquet
        </p>
        <p className="text-xs text-muted-foreground">
          Tómalo para asignarlo y continuar con la atención.
        </p>
      </div>
      <Button
        type="button"
        className="min-h-11"
        disabled={pending}
        onClick={onTake}
      >
        Tomar tiquet
      </Button>
    </div>
  )
}

function useActionPanel(
  ticket: TicketDetail,
  actions: ActionKey[],
  identity: Identity | null,
  participants: TicketParticipant[],
) {
  const canProxy = can(identity, 'act_on_behalf')
  const [subjectTechnicianId, setSubject] = useState('')
  const [formAction, setFormAction] = useState<ActionKey | null>(null)
  const subject =
    canProxy && subjectTechnicianId ? subjectTechnicianId : undefined
  const mutations = useTicketActions(ticket.id, subject)
  const offers = useMyOffers(
    identity?.userId,
    can(identity, 'ticket.take_offer'),
  )
  const hasOffer = Boolean(offers.data?.some((offer) => offer.id === ticket.id))
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
  const blocked = actionsRequiringSubject(identity, visible, Boolean(subject))
  const activeIds = participants
    .filter((item) => item.endedAt === null)
    .map((item) => item.technicianId)
  return {
    canProxy,
    subjectTechnicianId,
    setSubject,
    subject,
    mutations,
    hasOffer,
    oneClick,
    pending,
    visible,
    blocked,
    activeIds,
    formAction,
    setFormAction,
    close: () => setFormAction(null),
  }
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
        <>
          <ProxySelector
            participants={participants}
            value={panel.subjectTechnicianId}
            onChange={panel.setSubject}
          />
          <ProxyRequiredHint show={panel.blocked.length > 0} />
        </>
      ) : null}
      <ActionControls
        visible={panel.visible}
        oneClick={panel.oneClick}
        pending={panel.pending}
        blocked={panel.blocked}
        onOpenForm={panel.setFormAction}
      />
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
