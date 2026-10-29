import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useTicketSearchByFolio } from '@/features/tickets'
import { shellMessages } from '../i18n'
import { isNavItemVisible, NAV_SECTIONS } from './nav-items'
import type { NavItem } from './nav-items'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const resultClass =
  'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground'

function useDestination() {
  const navigate = useNavigate()
  return (item: NavItem) => {
    if (item.kind === 'tickets') {
      void navigate({ to: '/tickets', search: { page: 1 } })
    } else if (item.kind === 'catalog') {
      void navigate({ to: '/admin/catalogos', search: { catalog: 'teams' } })
    } else {
      void navigate({ to: item.to })
    }
  }
}

function navigationItems(term: string, identity: Identity | null): NavItem[] {
  const needle = term.toLocaleLowerCase('es-MX')
  return NAV_SECTIONS.flatMap((section) => section.items).filter((item) => {
    if (!isNavItemVisible(item, identity)) return false
    return item.label.toLocaleLowerCase('es-MX').includes(needle)
  })
}

function NavigationResults({
  items,
  onSelect,
}: {
  items: NavItem[]
  onSelect: (item: NavItem) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col">
      <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
        {shellMessages.search.navigation}
      </p>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={resultClass}
            onClick={() => onSelect(item)}
          >
            <Icon className="size-4 text-muted-foreground" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function TicketResults({
  items,
  onSelect,
}: {
  items: { id: string; folio: string; description: string }[]
  onSelect: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col">
      <p className="px-2 pt-3 pb-0.5 text-xs font-medium text-muted-foreground">
        {shellMessages.search.tickets}
      </p>
      {items.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          className={resultClass}
          onClick={() => onSelect(ticket.id)}
        >
          <span className="font-medium">{ticket.folio}</span>
          <span className="truncate text-muted-foreground">
            {ticket.description}
          </span>
        </button>
      ))}
    </div>
  )
}

function SearchResults({
  navItems,
  ticketItems,
  hasTerm,
  showEmpty,
  onNav,
  onTicket,
}: {
  navItems: NavItem[]
  ticketItems: { id: string; folio: string; description: string }[]
  hasTerm: boolean
  showEmpty: boolean
  onNav: (item: NavItem) => void
  onTicket: (id: string) => void
}) {
  return (
    <div className="max-h-80 overflow-y-auto p-2 max-sm:max-h-none max-sm:flex-1 max-sm:p-3">
      <NavigationResults items={navItems} onSelect={onNav} />
      {hasTerm ? (
        <TicketResults items={ticketItems} onSelect={onTicket} />
      ) : null}
      {showEmpty ? (
        <p
          role="status"
          className="px-2 py-6 text-center text-sm text-muted-foreground"
        >
          {shellMessages.search.empty}
        </p>
      ) : null}
    </div>
  )
}

/** Paleta de comandos: navegación rápida y búsqueda de tiquets por folio. */
export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [term, setTerm] = useState('')
  const { identity } = useAuth()
  const tickets = useTicketSearchByFolio(term)
  const goTo = useDestination()
  const navigate = useNavigate()

  function handleOpenChange(next: boolean) {
    if (!next) setTerm('')
    onOpenChange(next)
  }

  function close() {
    handleOpenChange(false)
  }

  const hasTerm = term.trim().length >= 2
  const navItems = navigationItems(term.trim(), identity)
  const ticketItems = tickets.data ?? []
  const showEmpty =
    term.trim().length > 0 &&
    navItems.length === 0 &&
    ticketItems.length === 0 &&
    !tickets.isLoading

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-svh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{shellMessages.search.open}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3 pr-12 max-sm:h-14 max-sm:px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={shellMessages.search.placeholder}
            aria-label={shellMessages.search.placeholder}
            autoComplete="off"
            className="h-11 border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
        <SearchResults
          navItems={navItems}
          ticketItems={ticketItems}
          hasTerm={hasTerm}
          showEmpty={showEmpty}
          onNav={(item) => {
            goTo(item)
            close()
          }}
          onTicket={(id) => {
            void navigate({
              to: '/tickets/$ticketId',
              params: { ticketId: id },
            })
            close()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
