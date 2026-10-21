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
): Promise<void> {
  await apiFetch(`/api/admin/catalogs/${table}`, {
    method: 'POST',
    body: JSON.stringify(values),
  })
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
