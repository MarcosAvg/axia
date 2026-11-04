import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  useBuildings,
  useDependencies,
  useLocations,
} from '@/features/catalogs'
import { useCreateTicketCatalogs } from './use-create-ticket-catalogs'

vi.mock('@/features/catalogs', () => ({
  useBuildings: vi.fn(() => ({ data: [], isLoading: false })),
  useLocations: vi.fn(() => ({ data: [], isLoading: false })),
  useDependencies: vi.fn(() => ({ data: [], isLoading: false })),
  useCategories: vi.fn(() => ({ data: [], isLoading: false })),
  useSubcategories: vi.fn(() => ({ data: [], isLoading: false })),
  useProblems: vi.fn(() => ({ data: [], isLoading: false })),
  useServiceTypes: vi.fn(() => ({ data: [], isLoading: false })),
  usePriorities: vi.fn(() => ({ data: [], isLoading: false })),
  useChannels: vi.fn(() => ({ data: [], isLoading: false })),
  useRequesters: vi.fn(() => ({ data: [], isLoading: false })),
}))

describe('useCreateTicketCatalogs', () => {
  it('pasa la dependencia a edificios y ubicaciones', () => {
    renderHook(() =>
      useCreateTicketCatalogs({
        dependencyId: 'dep-1',
        buildingId: 'b-1',
      }),
    )
    expect(useBuildings).toHaveBeenCalledWith('dep-1')
    expect(useLocations).toHaveBeenCalledWith('b-1', 'dep-1')
    expect(useDependencies).toHaveBeenCalledWith(undefined)
  })

  it('mantiene el filtro por ubicación cuando no hay dependencia', () => {
    renderHook(() =>
      useCreateTicketCatalogs({
        buildingId: 'b-1',
        locationId: 'l-1',
      }),
    )
    expect(useBuildings).toHaveBeenCalledWith(undefined)
    expect(useLocations).toHaveBeenCalledWith('b-1', undefined)
    expect(useDependencies).toHaveBeenCalledWith('l-1')
  })
})
