import { useQuery } from '@tanstack/react-query'
import { fetchCatalogOptions } from '../api/import-run-api'

/** Opciones (id + etiqueta) de un catálogo para resolver alias. */
export function useCatalogOptions(catalog: string | null) {
  return useQuery({
    queryKey: ['integrations', 'catalog-options', catalog ?? ''],
    queryFn: () =>
      catalog ? fetchCatalogOptions(catalog) : Promise.resolve([]),
    enabled: Boolean(catalog),
    staleTime: 5 * 60 * 1000,
  })
}
