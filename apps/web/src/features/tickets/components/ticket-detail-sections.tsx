import { cn } from 'cn'
import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Identity } from '@/features/auth'
import { TicketCycleChart } from '@/features/metrics'
import type { ActionKey } from '../domain/actions'
import type {
  TicketDetailWithTimes,
  TicketParticipant,
  TicketStatus,
  TicketTimelineItem,
} from '../domain/types'
import { detailSectionHints } from '../detail-hints'
import { useTicketEvidence } from '../hooks/use-tickets'
import type { TicketProxy } from '../hooks/use-ticket-proxy'
import { ticketMessages } from '../i18n'
import { EvidenceUploader } from './evidence-uploader'
import { PendingEvidence } from './pending-evidence'
import { TicketActionsPanel } from './ticket-actions-panel'
import { TicketEvidenceList } from './ticket-evidence-list'
import { TicketRatingPanel } from './ticket-rating-panel'
import { TicketTimeline } from './ticket-timeline'
import { ParticipantList } from './ticket-summary'

/** Sección del detalle: tarjeta en escritorio y bloque plano en móvil. */
export function Section({
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

export function EvidenceSection({
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

export function TicketExtras({
  ticketId,
  participants,
  canRate,
  subjectRequesterId,
  onOpenRating,
}: {
  ticketId: string
  participants: TicketParticipant[]
  canRate: boolean
  subjectRequesterId?: string
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
          <TicketRatingPanel
            ticketId={ticketId}
            subjectRequesterId={subjectRequesterId}
            onOpen={onOpenRating}
          />
        </Section>
      ) : null}
    </>
  )
}

export function CycleTimesSection({
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

export function TicketActivity({
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

export function ActionsSection({
  shared,
  proxy,
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
  proxy: TicketProxy
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
      <TicketActionsPanel {...shared} proxy={proxy} onValidated={onValidated} />
    </Section>
  )
}
