import { useQuery } from '@tanstack/react-query'
import {
  fetchCatalogImportRuns,
  loadCatalogRows,
} from '../api/catalog-import-api'

const keys = {
  rows: ['admin', 'catalog-import-rows'] as const,
  history: ['admin', 'catalog-import-history'] as const,
}

/** Filas de todos los catálogos (para resolver referencias y clasificar). */
export function useCatalogRows() {
  return useQuery({ queryKey: keys.rows, queryFn: loadCatalogRows })
}

/** Historial de cargas de catálogos. */
export function useCatalogImportHistory() {
  return useQuery({ queryKey: keys.history, queryFn: fetchCatalogImportRuns })
}
