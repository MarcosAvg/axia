import { ErrorAlert } from '@/components/shared/async-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { allowedActions } from '../domain/actions'
import type { TicketStatus } from '../domain/types'
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
}: {
  ticketId: string
  cycle: number
}) {
  const evidence = useTicketEvidence(ticketId)
  return (
    <Section title={ticketMessages.detail.evidence}>
      <div className="flex flex-col gap-4">
        <EvidenceUploader ticketId={ticketId} cycle={cycle} />
        <PendingEvidence ticketId={ticketId} />
        <TicketEvidenceList items={evidence.data ?? []} />
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

/** Detalle del tiquet: captura, acciones, línea de tiempo, participantes y evidencias. */
export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { identity } = useAuth()
  const { detail } = ticketMessages
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
  const canRecordTime = can(identity, 'time.record_manual')
  const canRate = canRateTicket(identity, ticket.data.status)

  return (
    <div className="flex flex-col gap-6">
      <Section title={detail.capture}>
        <TicketSummary ticket={ticket.data} />
      </Section>
      {actions.length > 0 ? (
        <Section title={detail.actions}>
          <TicketActionsPanel
            ticket={ticket.data}
            actions={actions}
            identity={identity}
            participants={participants.data ?? []}
          />
        </Section>
      ) : null}
      <Section title={detail.timeline}>
        <TicketTimeline items={timeline.data ?? []} />
      </Section>
      <Section title={detail.participants}>
        <ParticipantList participants={participants.data ?? []} />
      </Section>
      <EvidenceSection ticketId={ticketId} cycle={ticket.data.cycle} />
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
