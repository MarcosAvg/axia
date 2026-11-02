import { useState } from 'react'
import { cn } from 'cn'
import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { TicketCycleChart } from '@/features/metrics'
import { useMediaQuery } from '@/lib/use-media-query'
import type { ActionKey } from '../domain/actions'
import { detailSectionHints } from '../detail-hints'
import type {
  TicketDetailWithTimes,
  TicketParticipant,
  TicketStatus,
  TicketTimelineItem,
} from '../domain/types'
import { useTicketEvidence } from '../hooks/use-tickets'
import { ticketMessages } from '../i18n'
import { EvidenceUploader } from './evidence-uploader'
import { PausePanel } from './pause-panel'
import { PendingEvidence } from './pending-evidence'
import { TicketActionBar } from './ticket-action-bar'
import { TicketActionsPanel } from './ticket-actions-panel'
import { TicketEvidenceList } from './ticket-evidence-list'
import { TicketRatingDialog } from './ticket-rating-dialog'
import { TicketRatingPanel } from './ticket-rating-panel'
import { TicketTimeline } from './ticket-timeline'
import { ParticipantList, TicketSummary } from './ticket-summary'

/** Sección del detalle: tarjeta en escritorio y bloque plano en móvil. */
function Section({
  title,
  hint,
  className,
  children,
}: {
  title: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card
      className={cn(
        'gap-2 rounded-none bg-transparent py-4 ring-0 lg:gap-4 lg:rounded-xl lg:bg-card lg:ring-1',
        className,
      )}
    >
      <CardHeader className="px-0 lg:px-(--card-spacing)">
        <CardTitle as="h2">
          <HintLabel label={title} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 lg:px-(--card-spacing)">
        {children}
      </CardContent>
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

function TicketExtras({
  ticketId,
  participants,
  canRate,
  onOpenRating,
}: {
  ticketId: string
  participants: TicketParticipant[]
  canRate: boolean
  onOpenRating: () => void
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
      {canRate ? (
        <Section
          title={ticketMessages.rating.title}
          hint={detailSectionHints.rating}
        >
          <TicketRatingPanel ticketId={ticketId} onOpen={onOpenRating} />
        </Section>
      ) : null}
    </>
  )
}

function TicketActivity({
  ticketId,
  timeline,
}: {
  ticketId: string
  timeline: TicketTimelineItem[]
}) {
  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
      <Section title={ticketMessages.detail.timeline}>
        <TicketTimeline ticketId={ticketId} items={timeline} />
      </Section>
    </div>
  )
}

function ActionsSection({
  shared,
  isDesktop,
  hasActions,
  onValidated,
}: {
  shared: {
    ticket: TicketDetailWithTimes
    actions: ActionKey[]
    identity: Identity | null
    participants: TicketParticipant[]
  }
  isDesktop: boolean
  hasActions: boolean
  onValidated: () => void
}) {
  if (!isDesktop || !hasActions) return null
  return (
    <Section
      title={ticketMessages.detail.actions}
      hint={detailSectionHints.actions}
    >
      <TicketActionsPanel {...shared} onValidated={onValidated} />
    </Section>
  )
}

function CycleTimesSection({
  times,
  canSee,
}: {
  times: TicketDetailWithTimes['cycleTimes']
  canSee: boolean
}) {
  return (
    <Section
      title={ticketMessages.detail.cycleTimes}
      hint={detailSectionHints.cycleTimes}
      className={cn(!canSee && 'hidden lg:block')}
    >
      <TicketCycleChart times={times} />
    </Section>
  )
}

interface TicketLayoutProps {
  ticketId: string
  ticket: TicketDetailWithTimes
  participants: TicketParticipant[]
  identity: Identity | null
  actions: ActionKey[]
  timeline: TicketTimelineItem[]
  canRate: boolean
  canAttachEvidence: boolean
}

type TicketLayoutContentProps = TicketLayoutProps & {
  onValidated: () => void
  onOpenRating: () => void
}

function TicketLayoutContent({
  ticketId,
  ticket,
  participants,
  identity,
  actions,
  timeline,
  canRate,
  canAttachEvidence,
  onValidated,
  onOpenRating,
}: TicketLayoutContentProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const hasActions = actions.length > 0 || can(identity, 'ticket.take_offer')
  const shared = { ticket, actions, identity, participants }

  return (
    <div className="flex flex-col gap-6 pb-44 lg:pb-0">
      <CycleTimesSection
        times={ticket.cycleTimes}
        canSee={Boolean(can(identity, 'metrics.view'))}
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-6">
          <ActionsSection
            shared={shared}
            isDesktop={isDesktop}
            hasActions={hasActions}
            onValidated={onValidated}
          />
          <Section
            title={ticketMessages.detail.capture}
            hint={detailSectionHints.capture}
          >
            <TicketSummary ticket={ticket} />
          </Section>
          <PausePanel ticketId={ticketId} />
        </div>
        <TicketActivity ticketId={ticketId} timeline={timeline} />
        <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-6">
          <EvidenceSection
            ticketId={ticketId}
            cycle={ticket.cycle}
            status={ticket.status}
            canAttach={canAttachEvidence}
          />
          <TicketExtras
            ticketId={ticketId}
            participants={participants}
            canRate={canRate}
            onOpenRating={onOpenRating}
          />
        </div>
      </div>
      {!isDesktop && hasActions ? (
        <TicketActionBar {...shared} onValidated={onValidated} />
      ) : null}
    </div>
  )
}

export function TicketLayout(props: TicketLayoutProps) {
  const [ratingOpen, setRatingOpen] = useState(false)
  const canOpenRating =
    can(props.identity, 'ticket.rate') ||
    can(props.identity, 'ticket.rate_on_behalf')
  const openRatingAfterValidation = () => {
    if (props.ticket.isRequester && canOpenRating) setRatingOpen(true)
  }

  return (
    <>
      <TicketLayoutContent
        {...props}
        onValidated={openRatingAfterValidation}
        onOpenRating={() => setRatingOpen(true)}
      />
      {props.canRate || ratingOpen ? (
        <TicketRatingDialog
          ticketId={props.ticketId}
          open={ratingOpen}
          onOpenChange={setRatingOpen}
        />
      ) : null}
    </>
  )
}
