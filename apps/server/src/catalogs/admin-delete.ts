import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { AdminCatalogTable } from './admin.js'

type PostgresError = { code?: unknown; constraint?: unknown; cause?: unknown }

function databaseError(error: unknown): PostgresError | null {
  if (!error || typeof error !== 'object') return null
  const candidate = error as PostgresError
  if (candidate.code === '23503') return candidate
  return databaseError(candidate.cause)
}

/** Vínculos de configuración compartidos que no deben borrarse en cascada. */
const SHARED_LINKS: Partial<
  Record<AdminCatalogTable, { table: string; column: string; message: string }>
> = {
  categories: {
    table: 'technician_categories',
    column: 'category_id',
    message:
      'Tiene designaciones de técnicos; retíralas antes o desactiva la categoría.',
  },
  locations: {
    table: 'dependency_locations',
    column: 'location_id',
    message:
      'Está vinculada a dependencias; desactívala en lugar de eliminarla.',
  },
  requesters: {
    table: 'notifications',
    column: 'recipient_requester_id',
    message: 'Tiene avisos registrados; desactívalo en lugar de eliminarlo.',
  },
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  reasons_parent_id_fkey:
    'Tiene subestados o motivos hijos; elimínalos primero.',
  subcategories_category_id_fkey:
    'Tiene subcategorías; elimínalas primero o desactívala.',
  problems_subcategory_id_fkey:
    'Tiene problemas; elimínalos primero o desactívala.',
  locations_building_id_fkey:
    'Tiene ubicaciones; elimínalas primero o desactívalo.',
  technicians_team_id_fkey:
    'Tiene técnicos asignados; reasígnalos primero o desactívalo.',
  problems_team_id_fkey:
    'Tiene problemas asociados; desactívalo en lugar de eliminarlo.',
  supervisor_scopes_team_id_fkey:
    'Tiene ámbitos de supervisor; retíralos primero o desactívalo.',
  teams_work_calendar_id_fkey:
    'Hay equipos que usan este calendario; desactívalo en lugar de eliminarlo.',
  instance_settings_default_calendar_id_fkey:
    'Es el calendario por defecto de la instancia; desactívalo.',
  instance_settings_default_priority_id_fkey:
    'Es la prioridad por defecto de la instancia; desactívala.',
  problems_default_priority_id_fkey:
    'Hay problemas que la usan; desactívala en lugar de eliminarla.',
  requesters_dependency_id_fkey:
    'Hay solicitantes en esta dependencia; desactívala en lugar de eliminarla.',
  notifications_recipient_requester_id_fkey:
    'Tiene avisos registrados; desactívalo en lugar de eliminarlo.',
}

function inUseMessage(
  table: AdminCatalogTable,
  constraint: string | undefined,
): string {
  if (constraint && CONSTRAINT_MESSAGES[constraint]) {
    return CONSTRAINT_MESSAGES[constraint]
  }
  if (table === 'reasons') {
    return 'Hay tiquets que usan este motivo; desactívalo en lugar de eliminarlo.'
  }
  if (constraint?.startsWith('ticket')) {
    return 'Hay tiquets que usan este registro; desactívalo en lugar de eliminarlo.'
  }
  return 'Está en uso; desactívalo en lugar de eliminarlo.'
}

async function assertNoSharedLinks(
  tx: Pick<Database, 'execute'>,
  table: AdminCatalogTable,
  id: string,
) {
  const shared = SHARED_LINKS[table]
  if (!shared) return
  const linked = await tx.execute(sql`
    select 1
    from ${sql.identifier(shared.table)}
    where ${sql.identifier(shared.column)} = ${id}
    limit 1
  `)
  if (linked.rows[0]) {
    throw new AppError(409, 'in_use', shared.message)
  }
}

/**
 * Elimina un registro de catálogo que no está en uso. Si tiquets, historial o
 * configuración lo referencian, conserva la fila y devuelve un conflicto: en ese
 * caso la salida es desactivarlo. Nunca borra datos de negocio.
 */
export async function deleteAdminRow(
  db: Database,
  table: AdminCatalogTable,
  id: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await assertNoSharedLinks(tx, table, id)
    try {
      const result = await tx.execute(sql`
        delete from ${sql.identifier(table)} where id = ${id} returning id
      `)
      if (!result.rows[0]) {
        throw new AppError(404, 'not_found', 'Registro no encontrado')
      }
    } catch (error) {
      const violation = databaseError(error)
      if (!violation) throw error
      const constraint =
        typeof violation.constraint === 'string'
          ? violation.constraint
          : undefined
      throw new AppError(409, 'in_use', inUseMessage(table, constraint))
    }
  })
}
