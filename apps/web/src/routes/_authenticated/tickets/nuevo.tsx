import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { TicketForm, ticketMessages } from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/tickets/nuevo')({
  component: NewTicketPage,
})

function NewTicketPage() {
  return (
    <RequirePermission permission="ticket.create">
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-xl font-semibold">
            {ticketMessages.create.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ticketMessages.create.subtitle}
          </p>
        </header>
        <TicketForm />
      </div>
    </RequirePermission>
  )
}
