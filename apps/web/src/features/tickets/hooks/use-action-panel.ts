import { useState } from 'react'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ActionKey, ProxySubject } from '../domain/actions'
import {
  actionsRequiringSubject,
  isProxyAction,
  isRequesterProxyAction,
  isSupervisorIdentity,
} from '../domain/actions'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { useMyOffers } from '../hooks/use-tickets'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { DEDICATED } from '../components/ticket-action-handlers'

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

type ActionPanelInput = {
  ticket: TicketDetail
  actions: ActionKey[]
  identity: Identity | null
  participants: TicketParticipant[]
  subject: ProxySubject
  onValidated?: () => void
}

function validateBlockFor(
  ticket: TicketDetail,
  identity: Identity | null,
  subject: ProxySubject,
): 'waiting' | 'requester_only' | null {
  if (subject || !isSupervisorIdentity(identity)) return null
  if (ticket.validationPolicy === 'requester') return 'requester_only'
  if (ticket.validationPolicy === 'both' && !ticket.requesterValidated) {
    return 'waiting'
  }
  return null
}

function isVisibleFor(action: ActionKey, subject: ProxySubject): boolean {
  if (subject?.kind === 'technician') return isProxyAction(action)
  if (subject?.kind === 'requester') return isRequesterProxyAction(action)
  return true
}

function isAllowedAction(action: ActionKey): boolean {
  return (
    ONE_CLICK.includes(action) ||
    FORM_ACTIONS.includes(action) ||
    DEDICATED.includes(action)
  )
}

/** Estado compartido por el panel de acciones y su barra móvil. */
export function useActionPanel({
  ticket,
  actions,
  identity,
  participants,
  subject,
  onValidated,
}: ActionPanelInput) {
  const canProxy = can(identity, 'act_on_behalf')
  const [formAction, setFormAction] = useState<ActionKey | null>(null)
  const mutations = useTicketActions(ticket.id, subject)
  const offers = useMyOffers(
    identity?.userId,
    can(identity, 'ticket.take_offer'),
  )
  const hasOffer = Boolean(offers.data?.some((offer) => offer.id === ticket.id))
  const oneClick: Partial<Record<ActionKey, () => void>> = {
    validate: () =>
      mutations.validate.mutate({}, { onSuccess: () => onValidated?.() }),
  }
  const pending: Partial<Record<ActionKey, boolean>> = {
    validate: mutations.validate.isPending,
  }
  const validateBlocked = validateBlockFor(ticket, identity, subject)
  const proxyValidateDone =
    subject?.kind === 'requester' && ticket.requesterValidated
  const visible = actions
    .filter(
      (action) =>
        isVisibleFor(action, subject) &&
        !(action === 'validate' && (validateBlocked || proxyValidateDone)),
    )
    .filter(isAllowedAction)
  const blocked = actionsRequiringSubject(
    identity,
    visible,
    subject?.kind === 'technician',
  )
  const activeIds = participants
    .filter((item) => item.endedAt === null)
    .map((item) => item.technicianId)
  return {
    canProxy,
    subject,
    mutations,
    hasOffer,
    oneClick,
    pending,
    visible,
    blocked,
    validateBlocked,
    activeIds,
    formAction,
    setFormAction,
    close: () => setFormAction(null),
  }
}

export type ActionPanel = ReturnType<typeof useActionPanel>
