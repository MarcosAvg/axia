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
import { can, useAuth } from '@/features/auth'
import { useTicketSearchByFolio } from '@/features/tickets'
import { shellMessages } from '../i18n'
import { NAV_SECTIONS } from './nav-items'
import type { NavItem } from './nav-items'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const resultClass =
  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground'

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

function NavigationResults({
  term,
  onSelect,
}: {
  term: string
  onSelect: (item: NavItem) => void
}) {
  const { identity } = useAuth()
  const items = NAV_SECTIONS.flatMap((section) => section.items).filter(
    (item) => {
      if (item.permission && !can(identity, item.permission)) return false
      return item.label.toLowerCase().includes(term.toLowerCase())
    },
  )
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
  term,
  onSelect,
}: {
  term: string
  onSelect: (id: string) => void
}) {
  const query = useTicketSearchByFolio(term)
  const items = query.data ?? []
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

/** Paleta de comandos: navegación rápida y búsqueda de tiquets por folio. */
export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [term, setTerm] = useState('')
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{shellMessages.search.open}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
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
        <div className="max-h-80 overflow-y-auto p-2">
          <NavigationResults
            term={term}
            onSelect={(item) => {
              goTo(item)
              close()
            }}
          />
          {hasTerm ? (
            <TicketResults
              term={term}
              onSelect={(id) => {
                void navigate({
                  to: '/tickets/$ticketId',
                  params: { ticketId: id },
                })
                close()
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
