import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import type { NotificationItem } from '../domain/notification'
import { notificationLabel } from '../domain/notification'
import { notificationMessages } from '../i18n'

function NotificationBody({ item }: { item: NotificationItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium">{notificationLabel(item.type)}</span>
        {item.ticketFolio ? (
          <span className="text-sm text-muted-foreground">
            {item.ticketFolio}
          </span>
        ) : null}
      </div>
      <span className="text-xs text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </span>
    </div>
  )
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem
  onMarkRead: (id: string) => void
}) {
  const content = <NotificationBody item={item} />
  const link = item.ticketId ? (
    <Link
      to="/tickets/$ticketId"
      params={{ ticketId: item.ticketId }}
      className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
      onClick={() => {
        if (!item.readAt) onMarkRead(item.id)
      }}
    >
      {content}
    </Link>
  ) : (
    <div className="min-w-0 flex-1">{content}</div>
  )

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border p-3 ${
        item.readAt ? 'bg-card' : 'bg-primary/5'
      }`}
    >
      <span
        aria-hidden
        className={`mt-2 size-2 shrink-0 rounded-full ${
          item.readAt ? 'bg-transparent' : 'bg-primary'
        }`}
      />
      {link}
      {item.readAt ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 shrink-0 lg:size-7"
          aria-label={`${notificationMessages.markRead}: ${notificationLabel(item.type)}`}
          onClick={() => onMarkRead(item.id)}
        >
          <CheckIcon />
        </Button>
      )}
    </li>
  )
}

/** Lista de avisos con enlace al tiquet y acción de lectura. */
export function NotificationList({
  items,
  onMarkRead,
}: {
  items: NotificationItem[]
  onMarkRead: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <NotificationRow key={item.id} item={item} onMarkRead={onMarkRead} />
      ))}
    </ul>
  )
}
