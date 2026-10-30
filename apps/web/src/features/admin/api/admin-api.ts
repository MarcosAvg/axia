import { apiFetch } from '@/lib/api-client'

export type AdminTable =
  | 'teams'
  | 'buildings'
  | 'locations'
  | 'dependencies'
  | 'categories'
  | 'subcategories'
  | 'problems'
  | 'service_types'
  | 'priorities'
  | 'channels'
  | 'requesters'
  | 'technicians'
  | 'reasons'
  | 'work_calendars'

export type AdminRow = Record<string, unknown>
export type AdminValues = Record<string, string | number | boolean | null>

export async function adminList(
  table: AdminTable,
  orderBy = 'name',
): Promise<AdminRow[]> {
  const body = await apiFetch<{ items: AdminRow[] }>(
    `/api/admin/catalogs/${table}?orderBy=${encodeURIComponent(orderBy)}`,
  )
  return body.items
}

export async function adminInsert(
  table: AdminTable,
  values: AdminValues,
): Promise<string> {
  const body = await apiFetch<{ id: string }>(`/api/admin/catalogs/${table}`, {
    method: 'POST',
    body: JSON.stringify(values),
  })
  return body.id
}

export async function adminUpdate(
  table: AdminTable,
  id: string,
  values: AdminValues,
): Promise<void> {
  await apiFetch(`/api/admin/catalogs/${table}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export interface DependencyLocationLink {
  dependencyId: string
  dependencyName: string
  buildingId: string
  buildingName: string
  locationId: string
  locationName: string
}

export async function adminDependencyLocationLinks(): Promise<
  DependencyLocationLink[]
> {
  const body = await apiFetch<{ items: DependencyLocationLink[] }>(
    '/api/admin/catalogs/dependencies/locations',
  )
  return body.items
}

export async function adminDependencyLocationIds(
  id: string,
): Promise<string[]> {
  const body = await apiFetch<{ locationIds: string[] }>(
    `/api/admin/catalogs/dependencies/${id}/locations`,
  )
  return body.locationIds
}

export interface DependencyValues {
  name: string
  active: boolean
  locationIds: string[]
}

export async function adminSaveDependency(
  values: DependencyValues,
  id?: string,
): Promise<string> {
  if (id) {
    await apiFetch(`/api/admin/catalogs/dependencies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    })
    return id
  }
  const body = await apiFetch<{ id: string }>(
    '/api/admin/catalogs/dependencies',
    { method: 'POST', body: JSON.stringify(values) },
  )
  return body.id
}
