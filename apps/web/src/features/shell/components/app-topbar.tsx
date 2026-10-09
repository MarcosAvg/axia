import { MenuIcon, SearchIcon } from 'lucide-react'
import { OfflineIndicator } from '@/components/shared/offline-indicator'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { shellMessages } from '../i18n'
import { AppBreadcrumbs } from './breadcrumbs'
import { UserMenu } from './user-menu'

interface AppTopbarProps {
  onOpenSidebar: () => void
  onOpenSearch: () => void
}

/** Barra superior: menú móvil, migas de pan, búsqueda, tema y usuario. */
export function AppTopbar({ onOpenSidebar, onOpenSearch }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur lg:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={shellMessages.sidebar.open}
        onClick={onOpenSidebar}
      >
        <MenuIcon />
      </Button>
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="gap-2 text-muted-foreground"
          aria-label={shellMessages.search.aria}
          onClick={onOpenSearch}
        >
          <SearchIcon />
          <span className="hidden sm:inline">{shellMessages.search.open}</span>
          <kbd className="hidden items-center rounded border bg-muted px-1.5 font-mono text-[10px] md:inline-flex">
            ⌘{shellMessages.search.shortcut}
          </kbd>
        </Button>
        <OfflineIndicator />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
