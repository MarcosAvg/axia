import { useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { RequirePermission, useAuth } from '@/features/auth'
import {
  ACTIVE_STATUSES,
  TicketBoardPanel,
  TicketFilters,
  ticketFiltersFromSearch,
  ticketMessages,
  useMyOffers,
  useTicketFilterCatalogs,
  useTicketsList,
} from '@/features/tickets'
import type { TicketListSearch } from '@/features/tickets/schemas'
import { ticketListSearchSchema } from '@/features/tickets/schemas'

const BOARD_PAGE_SIZE = 100
const board = ticketMessages.board

export const Route = createFileRoute('/_authenticated/inbox_/tablero')({
  validateSearch: (search: Record<string, unknown>) =>
    ticketListSearchSchema.parse(search),
  component: InboxBoardPage,
})

function InboxBoardPage() {
  return (
    <RequirePermission permission="ticket.take_offer">
      <InboxBoardContent />
    </RequirePermission>
  )
}

function InboxBoardContent() {
  const { identity } = useAuth()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const catalogs = useTicketFilterCatalogs()
  const offers = useMyOffers(identity?.userId)
  const team = useTicketsList(
    { ...ticketFiltersFromSearch(search), statuses: ACTIVE_STATUSES },
    1,
    BOARD_PAGE_SIZE,
  )
  const offeredIds = useMemo(
    () => new Set((offers.data ?? []).map((ticket) => ticket.id)),
    [offers.data],
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={board.title}
        description={board.inboxSubtitle}
        actions={
          <Button variant="outline" asChild className="min-h-11">
            <Link to="/inbox">{board.backToList}</Link>
          </Button>
        }
      />
      <TicketFilters
        value={search}
        onChange={(next: TicketListSearch) => {
          void navigate({ to: '/inbox/tablero', search: next })
        }}
        catalogs={catalogs}
        showStatus={false}
      />
      <TicketBoardPanel
        isLoading={team.isLoading}
        isError={team.isError}
        items={team.data?.items ?? []}
        total={team.data?.total}
        offeredIds={offeredIds}
      />
    </div>
  )
}
