import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useTicket,
  useTicketEvidence,
  useTicketParticipants,
  useTicketTimeline,
} from '../hooks/use-tickets'
import { ticketMessages } from '../i18n'
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

/** Detalle del tiquet: captura, línea de tiempo, participantes y evidencias. */
export function TicketDetailView({ ticketId }: { ticketId: string }) {
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

  return (
    <div className="flex flex-col gap-6">
      <Section title={detail.capture}>
        <TicketSummary ticket={ticket.data} />
      </Section>
      <Section title={detail.timeline}>
        <TicketTimeline items={timeline.data ?? []} />
      </Section>
      <Section title={detail.participants}>
        <ParticipantList participants={participants.data ?? []} />
      </Section>
      <Section title={detail.evidence}>
        <TicketEvidenceList items={evidence.data ?? []} />
      </Section>
    </div>
  )
}
