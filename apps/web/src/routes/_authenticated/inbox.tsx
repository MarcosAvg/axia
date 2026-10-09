import { createFileRoute } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/features/auth'
import {
  ACTIVE_STATUSES,
  TicketList,
  ticketMessages,
  useMyOffers,
  useTicketsList,
} from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/inbox')({
  component: InboxPage,
})

function InboxPage() {
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
          <TicketList items={offers.data} />
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
          <TicketList items={team.data.items} />
        ) : (
          <EmptyState icon={InboxIcon} title={inbox.empty} />
        )}
      </section>
    </div>
  )
}
