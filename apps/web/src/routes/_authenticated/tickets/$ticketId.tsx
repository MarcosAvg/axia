import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { RequirePermission } from '@/features/auth'
import { TicketDetailView, ticketMessages } from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/tickets/$ticketId')({
  component: TicketDetailPage,
})

function TicketDetailPage() {
  const { ticketId } = Route.useParams()

  return (
    <RequirePermission permission="ticket.view">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="min-h-11 self-start">
          <Link to="/tickets" search={{ page: 1 }}>
            {ticketMessages.detail.back}
          </Link>
        </Button>
        <TicketDetailView ticketId={ticketId} />
      </div>
    </RequirePermission>
  )
}
