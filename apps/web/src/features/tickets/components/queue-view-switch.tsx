import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { ticketMessages } from '../i18n'

const { board } = ticketMessages

/** Conserva enlaces reales entre las dos vistas de una bandeja. */
export function QueueViewSwitch({
  view,
  children,
}: {
  view: 'list' | 'board'
  children: ReactElement
}) {
  const isList = view === 'list'
  const selected = (
    <span
      aria-current="page"
      className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-background px-3 text-sm font-semibold text-primary shadow-xs"
    >
      {isList ? board.listView : board.title}
    </span>
  )
  const link = (
    <Button asChild variant="ghost" className="min-h-11 flex-1 rounded-lg px-3">
      {children}
    </Button>
  )

  return (
    <nav
      aria-label={board.viewLabel}
      className="flex gap-1 rounded-xl border bg-muted p-1"
    >
      {isList ? selected : link}
      {isList ? link : selected}
    </nav>
  )
}
