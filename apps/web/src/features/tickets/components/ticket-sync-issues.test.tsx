import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import { db } from '@/lib/offline/db'
import { TicketSyncIssues } from './ticket-sync-issues'

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ session: { user: { id: 'owner' } } }),
}))

it('explica el rechazo, el estado del servidor y lo que queda en espera', async () => {
  const capture = {
    type: 'ticket_action',
    payload: { operation: 'pause' },
    orderingKey: 'ticket',
    userId: 'owner',
    attempts: 1,
    createdAt: Date.now(),
  }
  await db.outbox.bulkAdd([
    {
      ...capture,
      id: 'failed',
      seq: 1,
      state: 'error',
      lastError: 'El tiquet cambió',
      lastServerState: 'attended',
    },
    { ...capture, id: 'waiting', seq: 2, state: 'pending', lastError: null },
    {
      ...capture,
      id: 'other',
      seq: 3,
      state: 'error',
      userId: 'other',
      lastError: 'Otro usuario',
    },
  ])
  const view = render(<TicketSyncIssues ticketId="ticket" />)
  try {
    const issues = await screen.findByRole('list', {
      name: 'Problemas de sincronización',
    })
    expect(within(issues).getByText('El tiquet cambió')).toBeInTheDocument()
    expect(
      within(issues).getByText(/Operaciones posteriores en espera: 1/),
    ).toBeInTheDocument()
    expect(
      within(issues).getByText(/Estado al intentar sincronizar: Atendido/),
    ).toBeInTheDocument()
    expect(within(issues).queryByText('Otro usuario')).not.toBeInTheDocument()
  } finally {
    view.unmount()
    await db.outbox.clear()
  }
})
