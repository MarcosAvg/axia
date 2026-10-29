import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { ArrowLeftIcon, SearchIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/features/notifications'
import { shellMessages } from '../i18n'
import { AppBreadcrumbs, buildCrumbs } from './breadcrumbs'
import { OfflineIndicator } from './offline-indicator'
import { UserMenu } from './user-menu'

interface AppTopbarProps {
  onOpenSearch: () => void
}

function searchShortcut(): string {
  if (typeof navigator === 'undefined') return 'Ctrl K'
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'
}

/** Barra superior: contexto de la ruta, búsqueda, avisos, tema y usuario. */
export function AppTopbar({ onOpenSearch }: AppTopbarProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const crumbs = buildCrumbs(pathname)
  const title = crumbs.at(-1)?.label ?? ''
  const isDetail = /^\/tickets\/[^/]+$/.test(pathname)
  const router = useRouter()
  const navigate = useNavigate()

  function goBack() {
    if (window.history.length > 1) router.history.back()
    else void navigate({ to: '/tickets', search: { page: 1 } })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur md:gap-3 md:px-4">
      {isDetail ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          aria-label={shellMessages.tabbar.back}
          onClick={goBack}
        >
          <ArrowLeftIcon />
        </Button>
      ) : null}
      {isDetail ? (
        <p className="min-w-0 flex-1 truncate text-sm font-semibold md:hidden">
          {title}
        </p>
      ) : null}
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="size-11 gap-2 px-0 text-muted-foreground md:h-9 md:w-auto md:px-2.5"
          aria-label={shellMessages.search.aria}
          onClick={onOpenSearch}
        >
          <SearchIcon />
          <span className="hidden md:inline">{shellMessages.search.open}</span>
          <kbd className="hidden items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-foreground/70 md:inline-flex">
            {searchShortcut()}
          </kbd>
        </Button>
        <NotificationBell />
        <OfflineIndicator />
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </header>
  )
}
