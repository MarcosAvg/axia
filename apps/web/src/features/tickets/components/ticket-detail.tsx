import { Link } from '@tanstack/react-router'
import { TicketIcon } from 'lucide-react'
import { ErrorAlert } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { HintLabel } from '@/components/shared/hint'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { allowedActions } from '../domain/actions'
import type { ActionKey } from '../domain/actions'
import { detailSectionHints } from '../detail-hints'
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
import { PausePanel } from './pause-panel'
import { PendingEvidence } from './pending-evidence'
import { StatusBadge } from './status-badge'
import { TicketActionsPanel } from './ticket-actions-panel'
import { TicketEvidenceList } from './ticket-evidence-list'
import { TicketRatingPanel } from './ticket-rating-panel'
import { TicketTimeline } from './ticket-timeline'
import { ParticipantList, TicketSummary } from './ticket-summary'

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <HintLabel label={title} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function EvidenceSection({
  ticketId,
  cycle,
  status,
  canAttach,
}: {
  ticketId: string
  cycle: number
  status: TicketStatus
  canAttach: boolean
}) {
  const evidence = useTicketEvidence(ticketId)
  return (
    <Section
      title={ticketMessages.detail.evidence}
      hint={detailSectionHints.evidence}
    >
      <div className="flex flex-col gap-4">
        <PendingEvidence ticketId={ticketId} />
        <TicketEvidenceList items={evidence.data ?? []} />
        {canAttach ? (
          <EvidenceUploader ticketId={ticketId} cycle={cycle} status={status} />
        ) : null}
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
function TicketExtras({
  ticketId,
  participants,
  canRecordTime,
  canRate,
}: {
  ticketId: string
  participants: TicketParticipant[]
  canRecordTime: boolean
  canRate: boolean
}) {
  const { detail } = ticketMessages
  return (
    <>
      <Section
        title={detail.participants}
        hint={detailSectionHints.participants}
      >
        <ParticipantList participants={participants} />
      </Section>
      {canRecordTime ? (
        <Section
          title={manualTimeMessages.title}
          hint={detailSectionHints.times}
        >
          <ManualTimePanel ticketId={ticketId} />
        </Section>
      ) : null}
      {canRate ? (
        <Section
          title={ticketMessages.rating.title}
          hint={detailSectionHints.rating}
        >
          <TicketRatingPanel ticketId={ticketId} />
        </Section>
      ) : null}
    </>
  )
}

function TicketMain({
  ticketId,
  ticket,
  participants,
  identity,
  actions,
  canRecordTime,
  canRate,
  canAttachEvidence,
}: {
  ticketId: string
  ticket: TicketDetail
  participants: TicketParticipant[]
  identity: Identity | null
  actions: ActionKey[]
  canRecordTime: boolean
  canRate: boolean
  canAttachEvidence: boolean
}) {
  const { detail } = ticketMessages
  return (
    <div className="flex flex-col gap-6">
      {actions.length > 0 || can(identity, 'ticket.take_offer') ? (
        <Section title={detail.actions} hint={detailSectionHints.actions}>
          <TicketActionsPanel
            ticket={ticket}
            actions={actions}
            identity={identity}
            participants={participants}
          />
        </Section>
      ) : null}
      <Section title={detail.capture} hint={detailSectionHints.capture}>
        <TicketSummary ticket={ticket} />
      </Section>
      <PausePanel ticketId={ticketId} />
      <EvidenceSection
        ticketId={ticketId}
        cycle={ticket.cycle}
        status={ticket.status}
        canAttach={canAttachEvidence}
      />
      <TicketExtras
        ticketId={ticketId}
        participants={participants}
        canRecordTime={canRecordTime}
        canRate={canRate}
      />
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <TicketMain
          ticketId={ticketId}
          ticket={ticket.data}
          participants={participants.data ?? []}
          identity={identity}
          actions={actions}
          canRecordTime={can(identity, 'time.record_manual')}
          canRate={canRateTicket(identity, ticket.data.status)}
          canAttachEvidence={can(identity, 'evidence.attach')}
        />
        <TicketActivity timeline={timeline.data ?? []} />
      </div>
    </div>
  )
}
