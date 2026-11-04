import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from '@/lib/api-client'
import { fetchBuildings, fetchLocations } from './catalogs-api'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
  vi.mocked(apiFetch).mockResolvedValue({ items: [] })
})

describe('catálogos HTTP', () => {
  it('filtra edificios y ubicaciones por dependencia', async () => {
    await fetchBuildings('dep-1')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/catalogs/buildings?dependencyId=dep-1',
    )

    await fetchLocations('b-1', 'dep-1')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/catalogs/locations?buildingId=b-1&dependencyId=dep-1',
    )
  })

  it('conserva las rutas sin dependencia', async () => {
    await fetchBuildings()
    expect(apiFetch).toHaveBeenCalledWith('/api/catalogs/buildings')

    await fetchLocations('b-1')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/catalogs/locations?buildingId=b-1',
    )
  })
})
