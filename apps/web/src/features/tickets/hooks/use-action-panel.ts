import { useState } from 'react'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ActionKey } from '../domain/actions'
import { actionsRequiringSubject } from '../domain/actions'
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

/** Estado compartido por el panel de acciones y su barra móvil. */
export function useActionPanel(
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

export type ActionPanel = ReturnType<typeof useActionPanel>
