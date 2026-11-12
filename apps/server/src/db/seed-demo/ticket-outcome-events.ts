import type { EventDraft, TicketContext } from './ticket-internal.js'

type Push = (event: EventDraft) => void

function pushRatingEvent(context: TicketContext, push: Push) {
  const { ticket, people, times, ids } = context
  if (ticket.rating === undefined || !times.ratingAt) return
  push({
    type: 'rated',
    at: times.ratingAt,
    actorId:
      ticket.requester === 'ana' ? people.requesterUserId : people.supervisorId,
    subjectRequesterId: ids.requesterId,
    payload: { score: ticket.rating },
  })
}

function pushDiscardEvent(context: TicketContext, push: Push) {
  const { ticket, people, times, ids, reasons } = context
  if (
    (ticket.status !== 'rejected' && ticket.status !== 'cancelled') ||
    !times.discardAt
  ) {
    return
  }
  const fallback =
    ticket.status === 'rejected' ? 'Fuera de alcance' : 'Creado por error'
  push({
    type: ticket.status,
    at: times.discardAt,
    actorId: people.supervisorId,
    subjectRequesterId: ids.requesterId,
    reasonId: reasons.id(
      ticket.status === 'rejected' ? 'rejection' : 'cancellation',
      ticket.discardReason ?? fallback,
    ),
    payload: { note: 'Descarte ficticio de la demo' },
  })
}

function pushDuplicateEvent(context: TicketContext, push: Push) {
  const { ticket, people, times, ids } = context
  if (ticket.status !== 'duplicate' || !times.discardAt) return
  push({
    type: 'duplicate_marked',
    at: times.discardAt,
    actorId: people.supervisorId,
    subjectRequesterId: ids.requesterId,
    payload: { duplicateOf: ticket.duplicateOf },
  })
}

export function pushOutcomeEvents(context: TicketContext, push: Push) {
  pushRatingEvent(context, push)
  pushDiscardEvent(context, push)
  pushDuplicateEvent(context, push)
}
