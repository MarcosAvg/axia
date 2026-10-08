import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth'
import { allowedActions } from '../domain/actions'
import {
  useTicket,
  useTicketEvidence,
  useTicketParticipants,
  useTicketTimeline,
} from '../hooks/use-tickets'
import { ticketMessages } from '../i18n'
import { EvidenceUploader } from './evidence-uploader'
import { PendingEvidence } from './pending-evidence'
import { TicketActionsPanel } from './ticket-actions-panel'
import { TicketEvidenceList } from './ticket-evidence-list'
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

/** Detalle del tiquet: captura, acciones, línea de tiempo, participantes y evidencias. */
export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { identity } = useAuth()
  const { detail } = ticketMessages
  const ticket = useTicket(ticketId)
  const timeline = useTicketTimeline(ticketId)
  const participants = useTicketParticipants(ticketId)
  const evidence = useTicketEvidence(ticketId)

  if (ticket.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{ticketMessages.loading}</p>
    )
  }
  if (ticket.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ticketMessages.errors.load}
      </p>
    )
  }
  if (!ticket.data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ticketMessages.errors.notFound}
      </p>
    )
  }

  const actions = allowedActions({ identity, status: ticket.data.status })

  return (
    <div className="flex flex-col gap-6">
      <Section title={detail.capture}>
        <TicketSummary ticket={ticket.data} />
      </Section>
      {actions.length > 0 ? (
        <Section title={detail.actions}>
          <TicketActionsPanel ticket={ticket.data} actions={actions} />
        </Section>
      ) : null}
      <Section title={detail.timeline}>
        <TicketTimeline items={timeline.data ?? []} />
      </Section>
      <Section title={detail.participants}>
        <ParticipantList participants={participants.data ?? []} />
      </Section>
      <Section title={detail.evidence}>
        <div className="flex flex-col gap-4">
          <EvidenceUploader ticketId={ticketId} cycle={ticket.data.cycle} />
          <PendingEvidence ticketId={ticketId} />
          <TicketEvidenceList items={evidence.data ?? []} />
        </div>
      </Section>
    </div>
  )
}
