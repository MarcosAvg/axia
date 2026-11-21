import { EllipsisIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { can, useAuth } from '@/features/auth'
import { useAttentionCounts } from '@/features/tickets'
import { shellMessages } from '../i18n'
import { AppSidebar } from './app-sidebar'
import { NavBadge, navBadgeCount, navBadgeLabel } from './nav-badge'
import { NavDestination } from './nav-destination'
import { mobileTabs } from './nav-items'

const tabClass =
  'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-xs font-medium text-sidebar-foreground/80 transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary [&>svg]:size-5'

/** Barra inferior de la aplicación: tres destinos por rol y acceso al resto. */
export function AppTabbar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { identity } = useAuth()
  const tabs = mobileTabs(identity)
  const { data: attention } = useAttentionCounts(can(identity, 'ticket.view'))
  const badgeFor = (id: string) => navBadgeCount(id, attention)

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <nav
        aria-label={shellMessages.tabbar.label}
        className="shell-surface fixed inset-x-4 bottom-[calc(0.5rem+var(--app-safe-bottom))] z-40 flex items-stretch gap-1 p-1 lg:hidden"
      >
        {tabs.map((item) => {
          const Icon = item.icon
          const badge = badgeFor(item.id)
          return (
            <NavDestination
              key={item.id}
              item={item}
              className={tabClass}
              aria-label={navBadgeLabel(item.label, badge) ?? undefined}
            >
              <Icon aria-hidden />
              <NavBadge
                count={badge}
                className="absolute top-0.5 left-1/2 translate-x-2"
              />
              <span className="max-w-full truncate">{item.label}</span>
            </NavDestination>
          )
        })}
        <SheetTrigger className={tabClass}>
          <EllipsisIcon aria-hidden />
          <span>{shellMessages.tabbar.more}</span>
        </SheetTrigger>
      </nav>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85dvh] gap-0 overflow-hidden rounded-2xl border border-sidebar-border p-0 data-[side=bottom]:inset-x-4 data-[side=bottom]:bottom-[calc(0.5rem+var(--app-safe-bottom))] motion-reduce:animate-none motion-reduce:transition-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{shellMessages.tabbar.more}</SheetTitle>
        </SheetHeader>
        <AppSidebar mobile onNavigate={() => setMoreOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
