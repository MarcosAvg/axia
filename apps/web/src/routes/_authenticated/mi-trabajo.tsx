import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/features/auth'
import { TicketList, ticketMessages, useMyWork } from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/mi-trabajo')({
  component: MyWorkPage,
})

function MyWorkPage() {
  const { identity } = useAuth()
  const query = useMyWork(identity?.userId)
  const { myWork } = ticketMessages

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">{myWork.title}</h1>
        <p className="text-sm text-muted-foreground">{myWork.subtitle}</p>
      </header>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">
          {ticketMessages.loading}
        </p>
      ) : null}
      {query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {ticketMessages.errors.load}
        </p>
      ) : null}
      {query.data && query.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{myWork.empty}</p>
      ) : null}
      {query.data && query.data.length > 0 ? (
        <TicketList items={query.data} />
      ) : null}
    </div>
  )
}
