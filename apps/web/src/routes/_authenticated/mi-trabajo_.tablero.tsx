import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { RequirePermission, RequireTechnician, useAuth } from '@/features/auth'
import { TicketBoardPanel, ticketMessages, useMyWork } from '@/features/tickets'

const board = ticketMessages.board

export const Route = createFileRoute('/_authenticated/mi-trabajo_/tablero')({
  component: MyWorkBoardPage,
})

function MyWorkBoardPage() {
  return (
    <RequirePermission permission="ticket.view">
      <RequireTechnician>
        <MyWorkBoardContent />
      </RequireTechnician>
    </RequirePermission>
  )
}

function MyWorkBoardContent() {
  const { identity } = useAuth()
  const query = useMyWork(identity?.userId)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={board.title}
        description={board.myWorkSubtitle}
        actions={
          <Button variant="outline" asChild className="min-h-11">
            <Link to="/mi-trabajo">{board.backToList}</Link>
          </Button>
        }
      />
      <TicketBoardPanel
        isLoading={query.isLoading}
        isError={query.isError}
        items={query.data ?? []}
      />
    </div>
  )
}
