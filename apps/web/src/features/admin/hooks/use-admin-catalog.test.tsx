import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAdminSave } from './use-admin-catalog'

vi.mock('../api/admin-api', () => ({
  adminInsert: vi.fn().mockResolvedValue('new-id'),
}))
it('actualiza el catálogo operativo previamente consultado después de guardar en administración', async () => {
  const client = new QueryClient()
  client.setQueryData(['catalogs', 'reasons', 'pause'], [])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useAdminSave(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync({
      table: 'reasons',
      values: { use: 'pause', name: 'Material' },
    })
  })
  expect(
    client.getQueryState(['catalogs', 'reasons', 'pause'])?.isInvalidated,
  ).toBe(true)
})
