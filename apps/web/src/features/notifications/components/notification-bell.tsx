import { Link } from '@tanstack/react-router'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { unreadBadge } from '../domain/notification'
import { useUnreadCount } from '../hooks/use-notifications'
import { notificationMessages } from '../i18n'

/** Campana de avisos con contador de no leídas. */
export function NotificationBell() {
  const { data: count = 0 } = useUnreadCount()
  const label =
    count > 0
      ? notificationMessages.bellUnread(count)
      : notificationMessages.bell

  return (
    <Button
      asChild
      variant="ghost"
      size="icon-lg"
      className="relative size-11 lg:size-9"
    >
      <Link to="/avisos" aria-label={label}>
        <BellIcon />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground"
          >
            {unreadBadge(count)}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
