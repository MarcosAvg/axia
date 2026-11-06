import { useState } from 'react'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useMediaQuery } from '@/lib/use-media-query'
import type { ActionKey } from '../domain/actions'
import { canRateTicket } from '../domain/rating'
import { detailSectionHints } from '../detail-hints'
import type {
  TicketDetailWithTimes,
  TicketParticipant,
  TicketTimelineItem,
} from '../domain/types'
import { useTicketProxy } from '../hooks/use-ticket-proxy'
import type { TicketProxy } from '../hooks/use-ticket-proxy'
import { ticketMessages } from '../i18n'
import { PausePanel } from './pause-panel'
import { TicketActionBar } from './ticket-action-bar'
import {
  ActionsSection,
  AttachmentsSection,
  CycleTimesSection,
  EvidenceSection,
  Section,
  TicketActivity,
  TicketExtras,
} from './ticket-detail-sections'
import { TicketRatingDialog } from './ticket-rating-dialog'
import { TicketSummary } from './ticket-summary'

interface TicketLayoutProps {
  ticketId: string
  ticket: TicketDetailWithTimes
  participants: TicketParticipant[]
  identity: Identity | null
  actions: ActionKey[]
  timeline: TicketTimelineItem[]
  canAttachEvidence: boolean
}

type TicketLayoutContentProps = TicketLayoutProps & {
  proxy: TicketProxy
  canRate: boolean
  onValidated: () => void
  onOpenRating: () => void
}

function TicketContentColumns({
  ticketId,
  ticket,
  participants,
  identity,
  actions,
  timeline,
  canRate,
  canAttachEvidence,
  proxy,
  onValidated,
  onOpenRating,
}: TicketLayoutContentProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const hasActions = actions.length > 0 || proxy.canProxy
  const shared = { ticket, actions, identity, participants }
  const subjectRequesterId =
    proxy.subject?.kind === 'requester' ? proxy.subject.requesterId : undefined

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
      <div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-6">
        <ActionsSection
          shared={shared}
          proxy={proxy}
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
        <AttachmentsSection ticketId={ticketId} />
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
          subjectRequesterId={subjectRequesterId}
          onOpenRating={onOpenRating}
        />
      </div>
    </div>
  )
}

function TicketLayoutContent(props: TicketLayoutContentProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const hasActions = props.actions.length > 0 || props.proxy.canProxy
  const shared = {
    ticket: props.ticket,
    actions: props.actions,
    identity: props.identity,
    participants: props.participants,
  }

  return (
    <div className="flex flex-col gap-6 pb-44 lg:pb-0">
      <CycleTimesSection
        times={props.ticket.cycleTimes}
        canSee={Boolean(can(props.identity, 'metrics.view'))}
      />
      <TicketContentColumns {...props} />
      {!isDesktop && hasActions ? (
        <TicketActionBar
          {...shared}
          proxy={props.proxy}
          onValidated={props.onValidated}
        />
      ) : null}
    </div>
  )
}

export function TicketLayout(props: TicketLayoutProps) {
  const [ratingOpen, setRatingOpen] = useState(false)
  const proxy = useTicketProxy({
    ticket: props.ticket,
    identity: props.identity,
    participants: props.participants,
  })
  const canRate = canRateTicket({
    identity: props.identity,
    status: props.ticket.status,
    requesterValidated: props.ticket.requesterValidated,
    isRequester: props.ticket.isRequester,
    subject: proxy.subject,
  })
  const subjectRequesterId =
    proxy.subject?.kind === 'requester' ? proxy.subject.requesterId : undefined
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
        proxy={proxy}
        canRate={canRate}
        onValidated={openRatingAfterValidation}
        onOpenRating={() => setRatingOpen(true)}
      />
      {canRate || ratingOpen ? (
        <TicketRatingDialog
          ticketId={props.ticketId}
          subjectRequesterId={subjectRequesterId}
          open={ratingOpen}
          onOpenChange={setRatingOpen}
        />
      ) : null}
    </>
  )
}
