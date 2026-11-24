import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { PushPermission, useServerEvents } from '@/features/notifications'
import { shellMessages } from '../i18n'
import { AppSidebar } from './app-sidebar'
import { AppTabbar } from './app-tabbar'
import { AppTopbar } from './app-topbar'
import { GlobalSearch } from './global-search'

/** El detalle del tiquet ocupa el pulgar con su propia barra de acciones. */
function isTicketDetail(pathname: string): boolean {
  return /^\/tickets\/[^/]+$/.test(pathname)
}

function useSearchShortcut(
  setOpen: (update: (open: boolean) => boolean) => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])
}

/** Armazón de la aplicación autenticada: barra lateral, barra superior y contenido. */
export function AppShell() {
  useServerEvents()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const tabbar = !isTicketDetail(pathname)
  useSearchShortcut(setSearchOpen)

  return (
    <div className="flex min-h-svh w-full bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        {shellMessages.skipToContent}
      </a>
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 py-3 pl-3 transition-[width] duration-200 motion-reduce:transition-none lg:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <AppSidebar
          className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar/50 shadow-xs"
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onOpenSearch={() => setSearchOpen(true)} />
        <PushPermission />
        <main
          id="main-content"
          className={cn(
            'mx-auto w-full max-w-[1800px] flex-1 p-4 lg:p-6',
            tabbar && 'pb-[calc(5rem+var(--app-safe-bottom))] lg:pb-6',
          )}
        >
          <Outlet />
        </main>
      </div>

      {tabbar ? <AppTabbar /> : null}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
