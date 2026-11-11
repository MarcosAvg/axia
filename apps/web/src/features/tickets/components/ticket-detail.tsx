import { Link } from '@tanstack/react-router'
import { TicketIcon } from 'lucide-react'
import { ErrorAlert } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useDocumentTitle } from '@/lib/use-document-title'
import { allowedActions, isSupervisorIdentity } from '../domain/actions'
import { projectPendingTicket } from '../domain/pending-actions'
import type { PendingTicketAction } from '../domain/pending-actions'
import type {
  TicketDetailWithTimes,
  TicketParticipant,
  TicketTimelineItem,
} from '../domain/types'
import { usePendingTicketActions } from '../hooks/use-pending-actions'
import {
  useTicket,
  useTicketParticipants,
  useTicketPauseState,
  useTicketTimeline,
} from '../hooks/use-tickets'
import { ticketMessages } from '../i18n'
import { DuplicateAlertsPanel } from './duplicate-alerts-panel'
import { PendingActions } from './pending-actions'
import { TicketHeader } from './ticket-header'
import { TicketLayout } from './ticket-detail-layout'

function TicketLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

function TicketNotFound() {
  return (
    <EmptyState
      icon={TicketIcon}
      title={ticketMessages.errors.notFound}
      action={
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/tickets" search={{ page: 1 }}>
            {ticketMessages.detail.back}
          </Link>
        </Button>
      }
    />
  )
}

function TicketDetailContent({
  ticketId,
  ticket,
  timeline,
  participants,
  identity,
  pending,
}: {
  ticketId: string
  ticket: TicketDetailWithTimes
  timeline: TicketTimelineItem[]
  participants: TicketParticipant[]
  identity: Identity | null
  pending: PendingTicketAction[]
}) {
  const projection = projectPendingTicket(ticket, pending)
  const pause = useTicketPauseState(
    projection.ticket.status === 'paused' ? ticketId : undefined,
  )
  const actions = allowedActions({
    identity,
    status: projection.ticket.status,
    isRequester: projection.ticket.isRequester,
    requesterValidated: projection.ticket.requesterValidated,
    supervisorValidated: projection.ticket.supervisorValidated,
    canValidateRequester: projection.ticket.canValidateRequester,
    canValidateSupervisor: projection.ticket.canValidateSupervisor,
    validationPolicy: projection.ticket.validationPolicy,
    isSupervisorRole: isSupervisorIdentity(identity),
    hasTaken: projection.ticket.hasTaken,
    pauseHasAdvance: pause.data
      ? pause.data.advanceOptions.length > 0
      : undefined,
    pauseHasExit: pause.data ? pause.data.exitOptions.length > 0 : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <TicketHeader
        ticket={projection.ticket}
        pendingSync={projection.pending.length > 0}
      />
      <PendingActions actions={projection.pending} />
      <DuplicateAlertsPanel
        ticketId={ticketId}
        possibleDuplicate={projection.ticket.possibleDuplicate}
        canResolve={actions.includes('mark_duplicate')}
      />
      <TicketLayout
        ticketId={ticketId}
        ticket={projection.ticket}
        participants={participants}
        identity={identity}
        actions={actions}
        timeline={timeline}
        canAttachEvidence={can(identity, 'evidence.attach')}
      />
    </div>
  )
}

/** Detalle del tiquet: data principal y actividad como sidebar. */
export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { identity } = useAuth()
  const ticket = useTicket(ticketId)
  const timeline = useTicketTimeline(ticketId)
  const participants = useTicketParticipants(ticketId)
  const pending = usePendingTicketActions(ticketId)
  useDocumentTitle(ticket.data?.folio ?? ticketMessages.detail.title)

  if (ticket.isLoading) return <TicketLoading />
  if (ticket.isError) {
    return (
      <ErrorAlert
        message={ticketMessages.errors.load}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void ticket.refetch()
            }}
          >
            Reintentar
          </Button>
        }
      />
    )
  }
  if (!ticket.data) return <TicketNotFound />

  return (
    <TicketDetailContent
      ticketId={ticketId}
      ticket={ticket.data}
      timeline={timeline.data ?? []}
      participants={participants.data ?? []}
      identity={identity}
      pending={pending}
    />
  )
}
