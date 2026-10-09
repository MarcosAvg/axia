import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCheckIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FilePlus2Icon,
  FlagIcon,
  ImageIcon,
  MessageSquareIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendIcon,
  StarIcon,
  UserPlusIcon,
  WrenchIcon,
  XIcon,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { groupTimelineByCycle, timelineNote } from '../domain/timeline'
import type { EventType, TicketTimelineItem } from '../domain/types'
import { eventLabels, ticketMessages } from '../i18n'

const EVENT_ICONS: Record<EventType, LucideIcon> = {
  created: FilePlus2Icon,
  offered: SendIcon,
  taken: CheckIcon,
  reassigned_supervisor: RefreshCwIcon,
  assigned_technician: WrenchIcon,
  reassigned_technician: RefreshCwIcon,
  auxiliary_added: UserPlusIcon,
  capture_recaptured: PencilIcon,
  started: PlayIcon,
  paused: PauseIcon,
  pause_advanced: PauseIcon,
  resumed: PlayIcon,
  attended: CheckIcon,
  validated: CheckCheckIcon,
  claim_opened: AlertTriangleIcon,
  claim_resolved: CheckIcon,
  reopened: RotateCcwIcon,
  rejected: XIcon,
  cancelled: BanIcon,
  duplicate_marked: CopyIcon,
  reactivated: RotateCcwIcon,
  priority_changed: FlagIcon,
  comment: MessageSquareIcon,
  evidence_added: ImageIcon,
  manual_time_recorded: ClockIcon,
  rated: StarIcon,
  imported: DownloadIcon,
}

function FeedItem({
  item,
  isLast,
}: {
  item: TicketTimelineItem
  isLast: boolean
}) {
  const Icon = EVENT_ICONS[item.type]
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
          <Icon className="size-3.5 text-muted-foreground" />
        </span>
        {!isLast ? <span className="w-px flex-1 bg-border" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 pb-4 text-sm">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium">{eventLabels[item.type]}</span>
          {item.actorName ? (
            <span className="text-muted-foreground">{item.actorName}</span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatDateTime(item.occurredAt)}
          </span>
        </div>
        {item.reasonName ? (
          <span className="text-muted-foreground">{item.reasonName}</span>
        ) : null}
        {item.subjectTechnicianName ? (
          <span className="text-muted-foreground">
            {item.subjectTechnicianName}
          </span>
        ) : null}
        {timelineNote(item) ? <p>{timelineNote(item)}</p> : null}
      </div>
    </li>
  )
}

/** Línea de actividad del tiquet, agrupada por ciclo de atención. */
export function TicketTimeline({ items }: { items: TicketTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ticketMessages.detail.noTimeline}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groupTimelineByCycle(items).map((group) => (
        <div key={group.cycle} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">
            {ticketMessages.detail.fields.cycle} {group.cycle}
          </h3>
          <ol className="flex flex-col">
            {group.items.map((item, index) => (
              <FeedItem
                key={item.id}
                item={item}
                isLast={index === group.items.length - 1}
              />
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
