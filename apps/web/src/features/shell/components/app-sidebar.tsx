import { Link } from '@tanstack/react-router'
import { PanelLeftIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from 'cn'
import { can, useAuth } from '@/features/auth'
import { shellMessages } from '../i18n'
import { NAV_SECTIONS } from './nav-items'
import type { NavItem, NavSection } from './nav-items'

interface NavLinkProps {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}

const expandedClass =
  'flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:font-medium [&.active]:text-sidebar-accent-foreground'

const collapsedClass =
  'flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground'

function NavLink({ item, collapsed, onNavigate }: NavLinkProps) {
  const Icon: LucideIcon = item.icon
  const className = collapsed ? collapsedClass : expandedClass
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </>
  )

  const link =
    item.kind === 'tickets' ? (
      <Link
        to="/tickets"
        search={{ page: 1 }}
        className={className}
        activeProps={{ 'aria-current': 'page' }}
        onClick={onNavigate}
      >
        {content}
      </Link>
    ) : item.kind === 'catalog' ? (
      <Link
        to="/admin/catalogos"
        search={{ catalog: 'teams' }}
        className={className}
        activeProps={{ 'aria-current': 'page' }}
        onClick={onNavigate}
      >
        {content}
      </Link>
    ) : (
      <Link
        to={item.to}
        className={className}
        activeProps={{ 'aria-current': 'page' }}
        onClick={onNavigate}
      >
        {content}
      </Link>
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
  canAccess,
  onNavigate,
}: {
  section: NavSection
  collapsed: boolean
  canAccess: (permission?: string) => boolean
  onNavigate?: () => void
}) {
  const items = section.items.filter((item) => canAccess(item.permission))
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      <p
        className={cn(
          'px-2.5 pt-3 pb-1 text-xs font-medium text-muted-foreground',
          collapsed && 'sr-only',
        )}
      >
        {section.label}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.id}
          item={item}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

interface AppSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
}

/** Navegación lateral por áreas. Colapsable en escritorio, embebible en un cajón. */
export function AppSidebar({
  collapsed = false,
  onToggle,
  onNavigate,
}: AppSidebarProps) {
  const { identity } = useAuth()
  const canAccess = (permission?: string) =>
    permission ? can(identity, permission) : true

  return (
    <div className="flex h-full flex-col gap-1 border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-3',
          collapsed ? 'justify-center' : 'justify-between',
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
      <nav
        aria-label={shellMessages.nav.label}
        className="flex-1 overflow-y-auto px-2 pb-4"
      >
        {NAV_SECTIONS.map((section) => (
          <SectionLinks
            key={section.id}
            section={section}
            collapsed={collapsed}
            canAccess={canAccess}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  )
}
