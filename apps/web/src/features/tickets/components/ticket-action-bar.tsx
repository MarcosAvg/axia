import { EllipsisIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { actionEmphasis } from '../domain/action-emphasis'
import type { ActionKey } from '../domain/actions'
import { pickPrimaryAction } from '../domain/actions'
import { useActionPanel } from '../hooks/use-action-panel'
import type { ActionPanel } from '../hooks/use-action-panel'
import { ticketMessages } from '../i18n'
import { ActionContainer } from './action-container'
import { ProxyRequiredHint, ProxySelector } from './proxy-fields'
import type { TicketActionsPanelProps } from './ticket-actions-panel'

function isBlocked(panel: ActionPanel, action: ActionKey): boolean {
  return Boolean(panel.pending[action]) || panel.blocked.includes(action)
}

function runAction(panel: ActionPanel, action: ActionKey) {
  return () => (panel.oneClick[action] ?? (() => panel.setFormAction(action)))()
}

function BarPrimary({
  panel,
  takeOffer,
  primary,
}: {
  panel: ActionPanel
  takeOffer: boolean
  primary: ActionKey | null
}) {
  if (takeOffer) {
    return (
      <Button
        type="button"
        className="min-h-12 flex-1"
        disabled={panel.mutations.take.isPending}
        onClick={() => panel.mutations.take.mutate({})}
      >
        {ticketMessages.detail.takeOffer}
      </Button>
    )
  }
  if (!primary) return null

  return (
    <Button
      type="button"
      variant={actionEmphasis(primary) === 'danger' ? 'destructive' : 'default'}
      className="min-h-12 flex-1"
      disabled={isBlocked(panel, primary)}
      onClick={runAction(panel, primary)}
    >
      {ticketMessages.actions[primary]}
    </Button>
  )
}

function BarMenu({
  panel,
  actions,
}: {
  panel: ActionPanel
  actions: ActionKey[]
}) {
  if (actions.length === 0) return null
  const normal = actions.filter((action) => actionEmphasis(action) !== 'danger')
  const dangerous = actions.filter(
    (action) => actionEmphasis(action) === 'danger',
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 gap-1"
          aria-label={ticketMessages.detail.moreActions}
        >
          <EllipsisIcon aria-hidden />
          {ticketMessages.detail.moreActions}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        {normal.map((action) => (
          <DropdownMenuItem
            key={action}
            disabled={isBlocked(panel, action)}
            onSelect={runAction(panel, action)}
          >
            {ticketMessages.actions[action]}
          </DropdownMenuItem>
        ))}
        {dangerous.length > 0 ? <DropdownMenuSeparator /> : null}
        {dangerous.map((action) => (
          <DropdownMenuItem
            key={action}
            variant="destructive"
            disabled={isBlocked(panel, action)}
            onSelect={runAction(panel, action)}
          >
            {ticketMessages.actions[action]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Barra inferior del detalle: la acción primaria siempre al alcance del pulgar. */
export function TicketActionBar({
  ticket,
  actions,
  identity,
  participants,
}: TicketActionsPanelProps) {
  const panel = useActionPanel(ticket, actions, identity, participants)
  if (panel.visible.length === 0) return null

  const primary = pickPrimaryAction(panel.visible)
  const others = panel.visible.filter((action) => action !== primary)
  const takeOffer = ticket.status === 'registered' && panel.hasOffer

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-2">
        {panel.canProxy ? (
          <ProxySelector
            participants={participants}
            value={panel.subjectTechnicianId}
            onChange={panel.setSubject}
          />
        ) : null}
        <ProxyRequiredHint show={panel.blocked.length > 0} />
        <div className="flex items-center gap-2">
          <BarPrimary panel={panel} takeOffer={takeOffer} primary={primary} />
          <BarMenu panel={panel} actions={others} />
        </div>
      </div>
      <ActionContainer
        ticket={ticket}
        formAction={panel.formAction}
        subject={panel.subject}
        excludeIds={panel.activeIds}
        onClose={panel.close}
      />
    </div>
  )
}
