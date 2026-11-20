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
    if (router.history.canGoBack()) router.history.back()
    else void navigate({ to: '/tickets', search: { page: 1 } })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 bg-background/95 px-2 backdrop-blur max-lg:shell-surface max-lg:top-[max(0.5rem,env(safe-area-inset-top))] max-lg:mx-4 max-lg:mt-[max(0.5rem,env(safe-area-inset-top))] md:gap-3 md:px-4 lg:h-17 lg:px-6 lg:pt-3 lg:after:pointer-events-none lg:after:absolute lg:after:inset-x-6 lg:after:-bottom-px lg:after:border-b lg:after:border-sidebar-border">
      {isDetail ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl lg:hidden"
          aria-label={shellMessages.tabbar.back}
          onClick={goBack}
        >
          <ArrowLeftIcon />
        </Button>
      ) : null}
      <p className="min-w-0 flex-1 truncate px-1 text-sm font-semibold md:hidden">
        {isDetail ? title : shellMessages.brand}
      </p>
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="size-11 gap-2 px-0 text-muted-foreground max-lg:rounded-xl md:w-auto md:px-2.5 lg:h-9"
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
