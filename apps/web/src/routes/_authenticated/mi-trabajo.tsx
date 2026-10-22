import { createFileRoute } from '@tanstack/react-router'
import { HardHatIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { RequirePermission, RequireTechnician, useAuth } from '@/features/auth'
import {
  TicketList,
  TicketStatusSummary,
  ticketMessages,
  useMyWork,
} from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/mi-trabajo')({
  component: MyWorkPage,
})

function MyWorkPage() {
  return (
    <RequirePermission permission="ticket.view">
      <RequireTechnician>
        <MyWorkContent />
      </RequireTechnician>
    </RequirePermission>
  )
}

function MyWorkContent() {
  const { identity } = useAuth()
  const query = useMyWork(identity?.userId)
  const { myWork } = ticketMessages

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={myWork.title} description={myWork.subtitle} />
      {query.isLoading ? <LoadingList rows={4} /> : null}
      {query.isError ? (
        <ErrorAlert message={ticketMessages.errors.load} />
      ) : null}
      {query.data && query.data.length === 0 ? (
        <EmptyState icon={HardHatIcon} title={myWork.empty} />
      ) : null}
      {query.data && query.data.length > 0 ? (
        <>
          <TicketStatusSummary items={query.data} />
          <TicketList items={query.data} />
        </>
      ) : null}
    </div>
  )
}
