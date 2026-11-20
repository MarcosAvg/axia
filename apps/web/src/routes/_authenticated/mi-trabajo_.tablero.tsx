import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { RequirePermission, RequireTechnician, useAuth } from '@/features/auth'
import {
  QueueViewSwitch,
  TicketBoardPanel,
  ticketMessages,
  useMyWork,
} from '@/features/tickets'

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
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader
        title={ticketMessages.myWork.title}
        description={board.myWorkSubtitle}
        actions={
          <QueueViewSwitch view="board">
            <Link to="/mi-trabajo">{board.backToList}</Link>
          </QueueViewSwitch>
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
