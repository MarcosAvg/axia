import { createFileRoute, Link } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { RequirePermission, useAuth } from '@/features/auth'
import {
  ACTIVE_STATUSES,
  TakeOfferButton,
  TicketList,
  TicketStatusSummary,
  splitTeamQueue,
  ticketMessages,
  useMyOffers,
  useTicketsList,
  withoutOffers,
} from '@/features/tickets'
import type { TicketListItem } from '@/features/tickets'

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium">{children}</h2>
}

function OffersSection({
  offers,
  items,
}: {
  offers: ReturnType<typeof useMyOffers>
  items: TicketListItem[]
}) {
  const { inbox } = ticketMessages
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{inbox.offersCount(items.length)}</SectionTitle>
      {offers.isLoading ? <LoadingList rows={2} /> : null}
      {offers.isError ? (
        <ErrorAlert
          message={ticketMessages.errors.load}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void offers.refetch()}
            >
              {inbox.retry}
            </Button>
          }
        />
      ) : null}
      {!offers.isLoading && !offers.isError && items.length === 0 ? (
        <EmptyState icon={InboxIcon} title={inbox.offersEmpty} />
      ) : null}
      {items.length > 0 ? (
        <>
          <TicketStatusSummary items={items} />
          <TicketList
            items={items}
            showElapsed
            action={(ticket) => <TakeOfferButton ticketId={ticket.id} />}
          />
        </>
      ) : null}
    </section>
  )
}

function QueueList({
  title,
  items,
}: {
  title: string
  items: TicketListItem[]
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <TicketList items={items} showElapsed />
    </div>
  )
}

function TeamSection({
  team,
  items,
  queue,
}: {
  team: ReturnType<typeof useTicketsList>
  items: TicketListItem[]
  queue: ReturnType<typeof splitTeamQueue>
}) {
  const { inbox } = ticketMessages
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{inbox.teamCount(items.length)}</SectionTitle>
      {team.isLoading ? <LoadingList rows={3} /> : null}
      {team.isError ? (
        <ErrorAlert message={ticketMessages.errors.load} />
      ) : null}
      {team.data ? (
        <>
          <TicketStatusSummary items={items} />
          <QueueList
            title={inbox.unassignedCount(queue.unassigned.length)}
            items={queue.unassigned}
          />
          <QueueList
            title={inbox.inAttentionCount(queue.team.length)}
            items={queue.team}
          />
          {items.length === 0 ? (
            <EmptyState icon={InboxIcon} title={inbox.empty} />
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function InboxContent() {
  const { identity } = useAuth()
  const offers = useMyOffers(identity?.userId)
  const team = useTicketsList({ statuses: ACTIVE_STATUSES }, 1)
  const { inbox } = ticketMessages
  const offerItems = offers.data ?? []
  const offerIds = new Set(offerItems.map((ticket) => ticket.id))
  const teamItems = withoutOffers(team.data?.items ?? [], offerIds)
  const queue = splitTeamQueue(teamItems)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={inbox.title}
        description={inbox.subtitle}
        actions={
          <Button variant="outline" asChild className="min-h-11">
            <Link to="/inbox/tablero" search={{ page: 1 }}>
              {ticketMessages.board.open}
            </Link>
          </Button>
        }
      />
      <OffersSection offers={offers} items={offerItems} />
      <TeamSection team={team} items={teamItems} queue={queue} />
    </div>
  )
}
