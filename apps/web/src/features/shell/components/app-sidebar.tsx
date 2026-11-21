import { PanelLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar-menu'
import { cn } from 'cn'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { messages } from '@/lib/i18n'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useAttentionCounts } from '@/features/tickets'
import { shellMessages } from '../i18n'
import { navBadgeCount, navBadgeLabel, navBadgeText } from './nav-badge'
import { NavDestination } from './nav-destination'
import { isNavItemVisible, NAV_SECTIONS } from './nav-items'
import type { NavItem, NavSection } from './nav-items'

interface NavLinkProps {
  item: NavItem
  badge: number
  collapsed: boolean
  onNavigate?: () => void
}

function NavLink({ item, badge, collapsed, onNavigate }: NavLinkProps) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={collapsed ? item.label : undefined}
        className={cn(
          collapsed ? 'size-10 justify-center p-0' : 'h-11 lg:h-9',
          !collapsed && badge > 0 && 'pr-11',
        )}
      >
        <NavDestination
          item={item}
          onClick={onNavigate}
          aria-label={navBadgeLabel(item.label, badge) ?? undefined}
        >
          <Icon aria-hidden />
          <span className={collapsed ? 'sr-only' : 'truncate'}>
            {item.label}
          </span>
        </NavDestination>
      </SidebarMenuButton>
      {badge > 0 ? (
        <SidebarMenuBadge
          aria-hidden
          className={
            collapsed
              ? 'top-0 right-0 h-4 min-w-4 translate-y-0 rounded-full border border-sidebar-border bg-card text-[10px]'
              : undefined
          }
        >
          {navBadgeText(badge)}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
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
    <SidebarGroup>
      <SidebarGroupLabel asChild className={collapsed ? 'sr-only' : 'mb-0.5'}>
        <h2>{section.label}</h2>
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            badge={badgeFor(item.id)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
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
          collapsed ? 'space-y-2 px-1 pt-1' : 'space-y-3 px-3 pt-2',
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
        <div className="flex shrink-0 items-center gap-1 border-t border-sidebar-border px-3 pt-2 pb-[calc(0.5rem+var(--app-safe-bottom))] text-sm text-sidebar-foreground/70">
          <ThemeToggle />
          <span>{messages.theme.aria}</span>
        </div>
      ) : null}
    </div>
  )
}
