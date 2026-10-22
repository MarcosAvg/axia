import { createFileRoute } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { RequirePermission, useAuth } from '@/features/auth'
import {
  ACTIVE_STATUSES,
  TicketList,
  TicketStatusSummary,
  ticketMessages,
  useMyOffers,
  useTicketsList,
} from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/inbox')({
  component: InboxPage,
})

function InboxPage() {
  return (
    <RequirePermission permission="ticket.take_offer">
      <InboxContent />
    </RequirePermission>
  )
}

function InboxContent() {
  const { identity } = useAuth()
  const offers = useMyOffers(identity?.userId)
  const team = useTicketsList({ statuses: ACTIVE_STATUSES }, 1)
  const { inbox } = ticketMessages

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={inbox.title} description={inbox.subtitle} />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{inbox.offers}</h2>
        {offers.data && offers.data.length > 0 ? (
          <>
            <TicketStatusSummary items={offers.data} />
            <TicketList items={offers.data} />
          </>
        ) : (
          <EmptyState icon={InboxIcon} title={inbox.empty} />
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{inbox.team}</h2>
        {team.isLoading ? <LoadingList rows={3} /> : null}
        {team.isError ? (
          <ErrorAlert message={ticketMessages.errors.load} />
        ) : null}
        {team.data && team.data.items.length > 0 ? (
          <>
            <TicketStatusSummary items={team.data.items} />
            <TicketList items={team.data.items} />
          </>
        ) : (
          <EmptyState icon={InboxIcon} title={inbox.empty} />
        )}
      </section>
    </div>
  )
}
