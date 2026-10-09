import { Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { cn } from 'cn'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { shellMessages } from '../i18n'
import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import { GlobalSearch } from './global-search'

/** Armazón de la aplicación autenticada: barra lateral, barra superior y contenido. */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex min-h-svh w-full bg-background text-foreground">
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 border-r transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{shellMessages.brand}</SheetTitle>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          onOpenSidebar={() => setMobileOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
