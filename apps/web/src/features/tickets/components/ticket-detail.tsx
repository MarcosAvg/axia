import { ErrorAlert } from '@/components/shared/async-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { allowedActions } from '../domain/actions'
import type { ActionKey } from '../domain/actions'
import type {
  TicketDetail,
  TicketParticipant,
  TicketStatus,
  TicketTimelineItem,
} from '../domain/types'
import {
  useTicket,
  useTicketEvidence,
  useTicketParticipants,
  useTicketTimeline,
} from '../hooks/use-tickets'
import { manualTimeMessages, ticketMessages } from '../i18n'
import { EvidenceUploader } from './evidence-uploader'
import { ManualTimePanel } from './manual-time-panel'
import { PendingEvidence } from './pending-evidence'
import { StatusBadge } from './status-badge'
import { TicketActionsPanel } from './ticket-actions-panel'
import { TicketEvidenceList } from './ticket-evidence-list'
import { TicketRatingPanel } from './ticket-rating-panel'
import { TicketTimeline } from './ticket-timeline'
import { ParticipantList, TicketSummary } from './ticket-summary'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function EvidenceSection({
  ticketId,
  cycle,
  status,
}: {
  ticketId: string
  cycle: number
  status: TicketStatus
}) {
  const evidence = useTicketEvidence(ticketId)
  return (
    <Section title={ticketMessages.detail.evidence}>
      <div className="flex flex-col gap-4">
        <PendingEvidence ticketId={ticketId} />
        <TicketEvidenceList items={evidence.data ?? []} />
        <EvidenceUploader ticketId={ticketId} cycle={cycle} status={status} />
      </div>
    </Section>
  )
}

function canRateTicket(
  identity: Identity | null,
  status: TicketStatus,
): boolean {
  if (status !== 'closed') return false
  return can(identity, 'ticket.rate') || can(identity, 'ticket.rate_on_behalf')
}

function TicketHeader({ ticket }: { ticket: TicketDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ticket.folio}
        </h1>
        <StatusBadge status={ticket.status} />
        {ticket.priorityName ? (
          <span className="text-sm text-muted-foreground">
            {ticket.priorityName}
          </span>
        ) : null}
      </div>
      <p className="max-w-3xl text-sm">{ticket.description}</p>
    </div>
  )
}

/** Columna principal: la data del tiquet. */
function TicketMain({
  ticketId,
  ticket,
  participants,
  identity,
  actions,
  canRecordTime,
  canRate,
}: {
  ticketId: string
  ticket: TicketDetail
  participants: TicketParticipant[]
  identity: Identity | null
  actions: ActionKey[]
  canRecordTime: boolean
  canRate: boolean
}) {
  const { detail } = ticketMessages
  return (
    <div className="flex flex-col gap-6">
      {actions.length > 0 ? (
        <Section title={detail.actions}>
          <TicketActionsPanel
            ticket={ticket}
            actions={actions}
            identity={identity}
            participants={participants}
          />
        </Section>
      ) : null}
      <Section title={detail.capture}>
        <TicketSummary ticket={ticket} />
      </Section>
      <EvidenceSection
        ticketId={ticketId}
        cycle={ticket.cycle}
        status={ticket.status}
      />
      <Section title={detail.participants}>
        <ParticipantList participants={participants} />
      </Section>
      {canRecordTime ? (
        <Section title={manualTimeMessages.title}>
          <ManualTimePanel ticketId={ticketId} />
        </Section>
      ) : null}
      {canRate ? (
        <Section title={ticketMessages.rating.title}>
          <TicketRatingPanel ticketId={ticketId} />
        </Section>
      ) : null}
    </div>
  )
}

/** Sidebar: la actividad del tiquet. */
function TicketActivity({ timeline }: { timeline: TicketTimelineItem[] }) {
  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
      <Section title={ticketMessages.detail.timeline}>
        <TicketTimeline items={timeline} />
      </Section>
    </div>
  )
}

/** Detalle del tiquet: data principal y actividad como sidebar. */
export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { identity } = useAuth()
  const ticket = useTicket(ticketId)
  const timeline = useTicketTimeline(ticketId)
  const participants = useTicketParticipants(ticketId)

  if (ticket.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{ticketMessages.loading}</p>
    )
  }
  if (ticket.isError) {
    return <ErrorAlert message={ticketMessages.errors.load} />
  }
  if (!ticket.data) {
    return <ErrorAlert message={ticketMessages.errors.notFound} />
  }

  const actions = allowedActions({ identity, status: ticket.data.status })

  return (
    <div className="flex flex-col gap-6">
      <TicketHeader ticket={ticket.data} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <TicketMain
          ticketId={ticketId}
          ticket={ticket.data}
          participants={participants.data ?? []}
          identity={identity}
          actions={actions}
          canRecordTime={can(identity, 'time.record_manual')}
          canRate={canRateTicket(identity, ticket.data.status)}
        />
        <TicketActivity timeline={timeline.data ?? []} />
      </div>
    </div>
  )
}
