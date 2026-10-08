import { formatDateTime } from '@/lib/format'
import { groupTimelineByCycle, timelineNote } from '../domain/timeline'
import type { TicketTimelineItem } from '../domain/types'
import { eventLabels, ticketMessages } from '../i18n'

/** Línea de tiempo del tiquet, agrupada por ciclo de atención. */
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
          <ol className="flex flex-col gap-3 border-l pl-4">
            {group.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">{eventLabels[item.type]}</span>
                  {item.actorName ? (
                    <span className="text-muted-foreground">
                      {item.actorName}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.occurredAt)}
                  </span>
                </div>
                {item.reasonName ? (
                  <span className="text-muted-foreground">
                    {item.reasonName}
                  </span>
                ) : null}
                {item.subjectTechnicianName ? (
                  <span className="text-muted-foreground">
                    {item.subjectTechnicianName}
                  </span>
                ) : null}
                {timelineNote(item) ? <p>{timelineNote(item)}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
