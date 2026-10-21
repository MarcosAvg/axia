import { apiFetch } from '@/lib/api-client'
import type {
  CategoryOption,
  LocationOption,
  Option,
  ProblemOption,
  ReasonOption,
  ReasonUse,
  RequesterOption,
  SubcategoryOption,
  TechnicianOption,
} from '../domain/types'

async function fetchCatalog<T>(path: string): Promise<T[]> {
  const body = await apiFetch<{ items: T[] }>(path)
  return body.items
}

export const fetchTeams = () => fetchCatalog<Option>('/api/catalogs/teams')
export const fetchBuildings = () =>
  fetchCatalog<Option>('/api/catalogs/buildings')
export const fetchDependencies = () =>
  fetchCatalog<Option>('/api/catalogs/dependencies')
export const fetchServiceTypes = () =>
  fetchCatalog<Option>('/api/catalogs/service-types')
export const fetchChannels = () =>
  fetchCatalog<Option>('/api/catalogs/channels')
export const fetchPriorities = () =>
  fetchCatalog<Option>('/api/catalogs/priorities')
export const fetchCategories = () =>
  fetchCatalog<CategoryOption>('/api/catalogs/categories')
export const fetchRequesters = () =>
  fetchCatalog<RequesterOption>('/api/catalogs/requesters')
export const fetchTechnicians = () =>
  fetchCatalog<TechnicianOption>('/api/catalogs/technicians')

export function fetchLocations(buildingId: string) {
  return fetchCatalog<LocationOption>(
    `/api/catalogs/locations?buildingId=${encodeURIComponent(buildingId)}`,
  )
}

export function fetchSubcategories(categoryId: string) {
  return fetchCatalog<SubcategoryOption>(
    `/api/catalogs/subcategories?categoryId=${encodeURIComponent(categoryId)}`,
  )
}

export function fetchProblems(subcategoryId: string) {
  return fetchCatalog<ProblemOption>(
    `/api/catalogs/problems?subcategoryId=${encodeURIComponent(subcategoryId)}`,
  )
}

export function fetchReasons(use: ReasonUse) {
  return fetchCatalog<ReasonOption>(
    `/api/catalogs/reasons?use=${encodeURIComponent(use)}`,
  )
}
