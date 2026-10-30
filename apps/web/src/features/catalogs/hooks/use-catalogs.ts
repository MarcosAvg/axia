import { useQuery } from '@tanstack/react-query'
import {
  fetchBuildings,
  fetchCategories,
  fetchChannels,
  fetchDependencies,
  fetchLocations,
  fetchPriorities,
  fetchProblems,
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
  buildings: ['catalogs', 'buildings'] as const,
  dependencies: (locationId: string) =>
    ['catalogs', 'dependencies', locationId] as const,
  serviceTypes: ['catalogs', 'serviceTypes'] as const,
  channels: ['catalogs', 'channels'] as const,
  priorities: ['catalogs', 'priorities'] as const,
  categories: ['catalogs', 'categories'] as const,
  requesters: ['catalogs', 'requesters'] as const,
  locations: (buildingId: string) =>
    ['catalogs', 'locations', buildingId] as const,
  subcategories: (categoryId: string) =>
    ['catalogs', 'subcategories', categoryId] as const,
  problems: (subcategoryId: string) =>
    ['catalogs', 'problems', subcategoryId] as const,
  reasons: (use: ReasonUse) => ['catalogs', 'reasons', use] as const,
}

export function useTeams() {
  return useQuery({
    queryKey: catalogKeys.teams,
    queryFn: fetchTeams,
    staleTime,
  })
}

export function useTechnicians() {
  return useQuery({
    queryKey: catalogKeys.technicians,
    queryFn: fetchTechnicians,
    staleTime,
  })
}

export function useReasons(use: ReasonUse) {
  return useQuery({
    queryKey: catalogKeys.reasons(use),
    queryFn: () => fetchReasons(use),
    staleTime,
  })
}

export function useBuildings() {
  return useQuery({
    queryKey: catalogKeys.buildings,
    queryFn: fetchBuildings,
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

export function useServiceTypes() {
  return useQuery({
    queryKey: catalogKeys.serviceTypes,
    queryFn: fetchServiceTypes,
    staleTime,
  })
}

export function useChannels() {
  return useQuery({
    queryKey: catalogKeys.channels,
    queryFn: fetchChannels,
    staleTime,
  })
}

export function usePriorities() {
  return useQuery({
    queryKey: catalogKeys.priorities,
    queryFn: fetchPriorities,
    staleTime,
  })
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

export function useLocations(buildingId: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.locations(buildingId ?? ''),
    queryFn: () =>
      buildingId ? fetchLocations(buildingId) : Promise.resolve([]),
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
