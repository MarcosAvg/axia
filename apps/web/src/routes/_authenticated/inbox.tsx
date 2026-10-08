import { createFileRoute } from '@tanstack/react-router'
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
      <header>
        <h1 className="text-xl font-semibold">{inbox.title}</h1>
        <p className="text-sm text-muted-foreground">{inbox.subtitle}</p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{inbox.offers}</h2>
        {offers.data && offers.data.length > 0 ? (
          <TicketList items={offers.data} />
        ) : (
          <p className="text-sm text-muted-foreground">{inbox.empty}</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{inbox.team}</h2>
        {team.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {ticketMessages.loading}
          </p>
        ) : null}
        {team.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {ticketMessages.errors.load}
          </p>
        ) : null}
        {team.data && team.data.items.length > 0 ? (
          <TicketList items={team.data.items} />
        ) : (
          <p className="text-sm text-muted-foreground">{inbox.empty}</p>
        )}
      </section>
    </div>
  )
}
