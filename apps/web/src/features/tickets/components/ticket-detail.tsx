import { Link } from '@tanstack/react-router'
import { TicketIcon } from 'lucide-react'
import { ErrorAlert } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { can, useAuth } from '@/features/auth'
import { useDocumentTitle } from '@/lib/use-document-title'
import { allowedActions } from '../domain/actions'
import {
  useTicket,
  useTicketParticipants,
  useTicketTimeline,
} from '../hooks/use-tickets'
import { ticketMessages } from '../i18n'
import { TicketHeader } from './ticket-header'
import { canRateTicket, TicketLayout } from './ticket-detail-layout'

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

/** Detalle del tiquet: data principal y actividad como sidebar. */
export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { identity } = useAuth()
  const ticket = useTicket(ticketId)
  const timeline = useTicketTimeline(ticketId)
  const participants = useTicketParticipants(ticketId)
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

  const actions = allowedActions({ identity, status: ticket.data.status })

  return (
    <div className="flex flex-col gap-6">
      <TicketHeader ticket={ticket.data} />
      <TicketLayout
        ticketId={ticketId}
        ticket={ticket.data}
        participants={participants.data ?? []}
        identity={identity}
        actions={actions}
        timeline={timeline.data ?? []}
        canRate={canRateTicket(identity, ticket.data.status)}
        canAttachEvidence={can(identity, 'evidence.attach')}
      />
    </div>
  )
}
