import { createFileRoute, Link } from '@tanstack/react-router'
import { HardHatIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { RequirePermission, RequireTechnician, useAuth } from '@/features/auth'
import { QueueViewSwitch, ticketMessages, useMyWork } from '@/features/tickets'

import { OfflineWork } from './-offline-work'

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
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader
        title={myWork.title}
        description={myWork.subtitle}
        actions={
          <QueueViewSwitch view="list">
            <Link to="/mi-trabajo/tablero">{ticketMessages.board.open}</Link>
          </QueueViewSwitch>
        }
      />
      {query.isLoading ? <LoadingList rows={4} /> : null}
      {query.isError ? (
        <ErrorAlert message={ticketMessages.errors.load} />
      ) : null}
      {query.data && query.data.length === 0 ? (
        <EmptyState icon={HardHatIcon} title={myWork.empty} />
      ) : null}
      {identity && query.data ? (
        <section aria-label={myWork.subtitle} className="flex flex-col gap-3">
          <OfflineWork
            key={identity.userId}
            userId={identity.userId}
            items={query.data}
            confirmed={
              query.isSuccess && query.isFetchedAfterMount && !query.isFetching
            }
          />
        </section>
      ) : null}
    </div>
  )
}
