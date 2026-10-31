import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiError } from '@/lib/api-client'
import { adminInsert } from '../api/admin-api'
import { reasonsCatalog } from '../domain/catalogs-reasons'
import { useCatalogManager } from './use-catalog-manager'

vi.mock('../api/admin-api', () => ({
  adminList: vi.fn().mockResolvedValue([]),
  adminInsert: vi.fn(),
  adminUpdate: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

it.each([
  [409, 'El árbol tiene una pausa abierta', 'El árbol tiene una pausa abierta'],
  [500, 'detalle interno', 'No se pudo guardar.'],
])(
  'muestra una explicación segura cuando falla el guardado con estado %s',
  async (status, message, expected) => {
    vi.mocked(adminInsert).mockRejectedValueOnce(
      new ApiError({ status, code: 'conflict', message }),
    )
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useCatalogManager(reasonsCatalog), {
      wrapper,
    })
    act(() => result.current.handleSave({ name: 'Material', use: 'pause' }))
    await waitFor(() => expect(result.current.errorMessage).toBe(expected))
  },
)
