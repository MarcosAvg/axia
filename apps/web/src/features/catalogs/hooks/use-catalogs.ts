import { useQuery } from '@tanstack/react-query'
import {
  fetchBuildings,
  fetchCategories,
  fetchChannels,
  fetchDependencies,
  fetchLocations,
  fetchPriorities,
  fetchProblems,
  fetchProblemSearchCatalog,
  fetchReasons,
  fetchRequesters,
  fetchServiceTypes,
  fetchSubcategories,
  fetchTeams,
  fetchTechnicians,
} from '../api/catalogs-api'
import type { ReasonUse } from '../domain/types'

const staleTime = 5 * 60 * 1000

const catalogKeys = {
  teams: ['catalogs', 'teams'] as const,
  technicians: ['catalogs', 'technicians'] as const,
  buildings: (dependencyId: string) =>
    ['catalogs', 'buildings', dependencyId] as const,
  dependencies: (locationId: string) =>
    ['catalogs', 'dependencies', locationId] as const,
  serviceTypes: ['catalogs', 'serviceTypes'] as const,
  channels: ['catalogs', 'channels'] as const,
  priorities: ['catalogs', 'priorities'] as const,
  categories: ['catalogs', 'categories'] as const,
  problemSearch: ['catalogs', 'problems', 'all'] as const,
  requesters: ['catalogs', 'requesters'] as const,
  locations: (buildingId: string, dependencyId: string) =>
    ['catalogs', 'locations', buildingId, dependencyId] as const,
  subcategories: (categoryId: string) =>
    ['catalogs', 'subcategories', categoryId] as const,
  problems: (subcategoryId: string) =>
    ['catalogs', 'problems', subcategoryId] as const,
  reasons: (use: ReasonUse) =>
    use === 'pause'
      ? (['catalogs', 'reasons', use, 'transitions'] as const)
      : (['catalogs', 'reasons', use] as const),
}

export function useTeams() {
  return useQuery({
    queryKey: catalogKeys.teams,
    queryFn: fetchTeams,
    staleTime,
  })
}

function techniciansOptions() {
  return {
    queryKey: catalogKeys.technicians,
    queryFn: fetchTechnicians,
    staleTime,
  }
}

export function useTechnicians() {
  return useQuery(techniciansOptions())
}

function reasonsOptions(use: ReasonUse) {
  return {
    queryKey: catalogKeys.reasons(use),
    queryFn: () => fetchReasons(use),
    staleTime,
  }
}

export function useReasons(use: ReasonUse) {
  return useQuery(reasonsOptions(use))
}

export function fieldWorkCatalogOptions() {
  return [
    techniciansOptions(),
    serviceTypesOptions(),
    prioritiesOptions(),
    reasonsOptions('pause'),
  ] as const
}

export function useBuildings(dependencyId?: string) {
  return useQuery({
    queryKey: catalogKeys.buildings(dependencyId ?? ''),
    queryFn: () => fetchBuildings(dependencyId),
    staleTime,
  })
}

export function useDependencies(locationId?: string) {
  return useQuery({
    queryKey: catalogKeys.dependencies(locationId ?? ''),
    queryFn: () => fetchDependencies(locationId),
    staleTime,
  })
}

function serviceTypesOptions() {
  return {
    queryKey: catalogKeys.serviceTypes,
    queryFn: fetchServiceTypes,
    staleTime,
  }
}

export function useServiceTypes() {
  return useQuery(serviceTypesOptions())
}

export function useChannels() {
  return useQuery({
    queryKey: catalogKeys.channels,
    queryFn: fetchChannels,
    staleTime,
  })
}

function prioritiesOptions() {
  return {
    queryKey: catalogKeys.priorities,
    queryFn: fetchPriorities,
    staleTime,
  }
}

export function usePriorities() {
  return useQuery(prioritiesOptions())
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: fetchCategories,
    staleTime,
  })
}

export function useRequesters() {
  return useQuery({
    queryKey: catalogKeys.requesters,
    queryFn: fetchRequesters,
    staleTime,
  })
}

export function useLocations(
  buildingId: string | undefined,
  dependencyId?: string,
) {
  return useQuery({
    queryKey: catalogKeys.locations(buildingId ?? '', dependencyId ?? ''),
    queryFn: () =>
      buildingId
        ? fetchLocations(buildingId, dependencyId)
        : Promise.resolve([]),
    enabled: Boolean(buildingId),
    staleTime,
  })
}

export function useSubcategories(categoryId: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.subcategories(categoryId ?? ''),
    queryFn: () =>
      categoryId ? fetchSubcategories(categoryId) : Promise.resolve([]),
    enabled: Boolean(categoryId),
    staleTime,
  })
}

export function useProblems(subcategoryId: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.problems(subcategoryId ?? ''),
    queryFn: () =>
      subcategoryId ? fetchProblems(subcategoryId) : Promise.resolve([]),
    enabled: Boolean(subcategoryId),
    staleTime,
  })
}

export function useProblemSearchCatalog() {
  return useQuery({
    queryKey: catalogKeys.problemSearch,
    queryFn: fetchProblemSearchCatalog,
    staleTime,
  })
}
