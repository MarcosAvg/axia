import { useState } from 'react'
import { cn } from 'cn'
import { SELECTED_CONTROL } from '@/lib/selection'
import { HintLabel } from '@/components/shared/hint'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Identity } from '@/features/auth'
import type { ActionKey } from '../domain/actions'
import type {
  TicketDetailWithTimes,
  TicketParticipant,
  TicketStatus,
  TicketTimelineItem,
} from '../domain/types'
import { detailSectionHints } from '../detail-hints'
import { useTicketAttachments } from '../hooks/use-attachments'
import { useTicketEvidence } from '../hooks/use-tickets'
import type { TicketProxy } from '../hooks/use-ticket-proxy'
import { ticketMessages } from '../i18n'
import { EvidenceUploader } from './evidence-uploader'
import { PendingEvidence } from './pending-evidence'
import { TicketActionsPanel } from './ticket-actions-panel'
import { TicketAttachmentsList } from './ticket-attachments-list'
import { TicketCycleChart } from './ticket-cycle-chart'
import { TicketCycleSummary } from './ticket-cycle-summary'
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
        'gap-2 rounded-none border-0 bg-transparent py-4 lg:gap-4 lg:rounded-xl lg:border lg:bg-card',
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

export function AttachmentsSection({ ticketId }: { ticketId: string }) {
  const attachments = useTicketAttachments(ticketId)
  return (
    <Section
      title={ticketMessages.detail.attachments}
      hint={detailSectionHints.attachments}
    >
      <TicketAttachmentsList items={attachments.data ?? []} />
    </Section>
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
  timesLabor,
  timesExtra,
  canSee,
}: {
  times: TicketDetailWithTimes['cycleTimes']
  timesLabor: TicketDetailWithTimes['cycleTimesLabor']
  timesExtra: TicketDetailWithTimes['cycleTimesExtra']
  canSee: boolean
}) {
  const [mode, setMode] = useState<'calendar' | 'laboral' | 'extra'>('calendar')
  const selected =
    mode === 'calendar' ? times : mode === 'laboral' ? timesLabor : timesExtra
  return (
    <Section
      title={ticketMessages.detail.cycleTimes}
      hint={detailSectionHints.cycleTimes}
      className={cn(!canSee && 'hidden lg:block')}
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={ticketMessages.detail.cycleTimes}
        >
          {(['calendar', 'laboral', 'extra'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? 'secondary' : 'outline'}
              className={mode === value ? SELECTED_CONTROL : undefined}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {ticketMessages.detail.timeModes[value]}
            </Button>
          ))}
        </div>
        <TicketCycleChart times={selected} />
        <TicketCycleSummary times={selected} />
      </div>
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
