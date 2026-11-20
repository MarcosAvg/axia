import { PanelLeftIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from 'cn'
import { ToneDot } from '@/components/shared/tone'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { messages } from '@/lib/i18n'
import { toneForId } from '@/lib/tones'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useAttentionCounts } from '@/features/tickets'
import { shellMessages } from '../i18n'
import { NavBadge, navBadgeCount, navBadgeLabel } from './nav-badge'
import { NavDestination } from './nav-destination'
import { isNavItemVisible, NAV_SECTIONS } from './nav-items'
import type { NavItem, NavSection } from './nav-items'

interface NavLinkProps {
  item: NavItem
  badge: number
  collapsed: boolean
  onNavigate?: () => void
}

const expandedClass =
  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:min-h-10 aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary dark:aria-[current=page]:bg-primary/15'

const collapsedClass =
  'flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary dark:aria-[current=page]:bg-primary/15'

function NavLink({ item, badge, collapsed, onNavigate }: NavLinkProps) {
  const Icon: LucideIcon = item.icon
  const className = collapsed ? collapsedClass : expandedClass
  const content = (
    <>
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className="size-4 shrink-0" />
        {collapsed ? (
          <NavBadge count={badge} className="absolute -top-1.5 -right-2" />
        ) : null}
      </span>
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
      {collapsed ? null : <NavBadge count={badge} className="ml-auto" />}
    </>
  )

  const link = (
    <NavDestination
      item={item}
      className={className}
      onNavigate={onNavigate}
      ariaLabel={navBadgeLabel(item.label, badge) ?? undefined}
    >
      {content}
    </NavDestination>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function SectionLinks({
  section,
  collapsed,
  identity,
  mobile,
  badgeFor,
  onNavigate,
}: {
  section: NavSection
  collapsed: boolean
  identity: Identity | null
  mobile: boolean
  badgeFor: (id: string) => number
  onNavigate?: () => void
}) {
  const items = section.items.filter((item) =>
    isNavItemVisible(item, identity, mobile),
  )
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      <p
        className={cn(
          'flex items-center gap-2 px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground',
          collapsed && 'sr-only',
        )}
      >
        <ToneDot tone={toneForId(section.id)} />
        {section.label}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.id}
          item={item}
          badge={badgeFor(item.id)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

interface AppSidebarProps {
  className?: string
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
  /** Menú dentro del cajón móvil: agrupa administración y añade el tema. */
  mobile?: boolean
}

function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={cn(
        'mx-3 flex h-14 shrink-0 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'justify-between px-1',
      )}
    >
      {!collapsed ? (
        <span className="px-1 text-lg font-semibold tracking-tight">
          {shellMessages.brand}
        </span>
      ) : null}
      {onToggle ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            collapsed
              ? shellMessages.sidebar.expand
              : shellMessages.sidebar.collapse
          }
          onClick={onToggle}
        >
          <PanelLeftIcon />
        </Button>
      ) : null}
    </div>
  )
}

/** Navegación lateral por áreas. Colapsable en escritorio, embebible en un cajón. */
export function AppSidebar({
  className,
  collapsed = false,
  onToggle,
  onNavigate,
  mobile = false,
}: AppSidebarProps) {
  const { identity } = useAuth()
  const { data: attention } = useAttentionCounts(can(identity, 'ticket.view'))
  const badgeFor = (id: string) => navBadgeCount(id, attention)

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 grow flex-col gap-1 bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
      <nav
        aria-label={shellMessages.nav.label}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3',
          collapsed ? 'px-1 pt-1' : 'space-y-1 px-3',
        )}
      >
        {NAV_SECTIONS.map((section) => (
          <SectionLinks
            key={section.id}
            section={section}
            collapsed={collapsed}
            identity={identity}
            mobile={mobile}
            badgeFor={badgeFor}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      {mobile ? (
        <div className="flex shrink-0 items-center gap-1 border-t border-sidebar-border px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-sm text-sidebar-foreground/70">
          <ThemeToggle />
          <span>{messages.theme.aria}</span>
        </div>
      ) : null}
    </div>
  )
}
