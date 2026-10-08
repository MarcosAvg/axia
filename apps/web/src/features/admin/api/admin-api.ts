// Escritura y lectura de administración. Las tablas son dinámicas pero se restringen a una lista
// blanca (AdminTable) y los datos se validan con Zod en los formularios; la base aplica sus
// restricciones. Donde el cliente tipado no puede estrechar una tabla dinámica se documenta con
// `@ts-expect-error`.

import { supabase } from '@/lib/supabase'

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
  const { data, error } = await supabase.from(table).select('*').order(orderBy)
  if (error) throw error
  return data ?? []
}

export async function adminInsert(
  table: AdminTable,
  values: AdminValues,
): Promise<void> {
  // @ts-expect-error la tabla es dinámica (lista blanca en AdminTable).
  const { error } = await supabase.from(table).insert(values)
  if (error) throw error
}

export async function adminUpdate(
  table: AdminTable,
  id: string,
  values: AdminValues,
): Promise<void> {
  // @ts-expect-error la tabla es dinámica (lista blanca en AdminTable).
  const { error } = await supabase.from(table).update(values).eq('id', id)
  if (error) throw error
}
