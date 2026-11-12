import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { insertAdminRow, updateAdminRow } from './admin.js'
import { REASON_USES } from './names.js'

type Executor = Pick<Database, 'execute'>
const reasonSchema = z.strictObject({
  use: z.enum(REASON_USES),
  name: z.string().trim().min(1).max(200),
  parent_id: z.string().uuid().nullable(),
  position: z.number().int().min(-32768).max(32767),
  requires_note: z.boolean(),
  allows_estimated_date: z.boolean(),
  clock_class: z.enum(['counted', 'not_counted']),
  active: z.boolean(),
  pause_step_kind: z.enum(['progress', 'exit']).nullable(),
})
const createSchema = reasonSchema.extend({
  parent_id: reasonSchema.shape.parent_id.default(null),
  position: reasonSchema.shape.position.default(0),
  requires_note: reasonSchema.shape.requires_note.default(false),
  allows_estimated_date:
    reasonSchema.shape.allows_estimated_date.default(false),
  clock_class: reasonSchema.shape.clock_class.default('counted'),
  active: reasonSchema.shape.active.default(true),
  pause_step_kind: reasonSchema.shape.pause_step_kind.default(null),
})
type Reason = z.infer<typeof reasonSchema>
const structuralFields = [
  'use',
  'parent_id',
  'requires_note',
  'allows_estimated_date',
  'clock_class',
  'active',
  'pause_step_kind',
] as const

function invalid(message: string) {
  return new AppError(400, 'validation_error', message)
}

async function currentReason(tx: Executor, id: string): Promise<Reason> {
  const result = await tx.execute(sql`
    select use, name, parent_id, position, requires_note, allows_estimated_date, clock_class, active, pause_step_kind
    from public.reasons where id = ${id}
  `)
  if (!result.rows[0])
    throw new AppError(404, 'not_found', 'Motivo no encontrado')
  return reasonSchema.parse(result.rows[0])
}

async function validateParent(tx: Executor, reason: Reason, id?: string) {
  if (!reason.parent_id) return
  const parent = await tx.execute(
    sql`select use from public.reasons where id = ${reason.parent_id}`,
  )
  if (!parent.rows[0] || parent.rows[0].use !== reason.use) {
    throw invalid('El motivo padre debe existir y tener el mismo uso')
  }
  if (!id) return
  const descendants = await tx.execute(sql`
    with recursive descendants(id) as (
      select id from public.reasons where id = ${id}
      union
      select r.id from public.reasons r join descendants d on r.parent_id = d.id
    ) select id from descendants where id = ${reason.parent_id}
  `)
  if (descendants.rows[0])
    throw invalid(
      'El motivo padre no puede ser el propio motivo ni un descendiente',
    )
}

async function validateChildren(tx: Executor, reason: Reason, id: string) {
  const result = await tx.execute(sql`
    select id from public.reasons where parent_id = ${id} and use <> ${reason.use} limit 1
  `)
  if (result.rows[0])
    throw invalid(
      'No puedes cambiar el uso de un motivo con descendientes de otro uso',
    )
}

async function preserveOpenPause(tx: Executor, id: string) {
  const result = await tx.execute(sql`
    with recursive tree(id, parent_id) as (
      select id, parent_id from public.reasons where id = ${id}
      union
      select r.id, r.parent_id from public.reasons r
      join tree t on r.parent_id = t.id or r.id = t.parent_id
    )
    select id from public.ticket_pauses
    where closed_at is null and root_reason_id in (select id from tree) limit 1
  `)
  if (result.rows[0]) {
    throw new AppError(
      409,
      'conflict',
      'El árbol tiene una pausa abierta; solo puedes cambiar nombres y orden o agregar subestados',
    )
  }
}

function duplicateError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && error.code === '23505') return true
  return 'cause' in error && duplicateError(error.cause)
}

/** Valida y guarda motivos sin permitir ciclos ni invalidar una pausa abierta. */
export async function saveAdminReason(
  db: Database,
  body: unknown,
  id?: string,
) {
  const values = id
    ? reasonSchema.partial().parse(body)
    : createSchema.parse(body)
  if (Object.keys(values).length === 0)
    throw invalid('No hay valores para guardar')
  try {
    return await db.transaction(async (tx) => {
      // Coordina la edición con la validación de motivos al iniciar una pausa.
      await tx.execute(
        sql`lock table public.reasons in share row exclusive mode`,
      )
      const current = id ? await currentReason(tx, id) : undefined
      const reason = reasonSchema.parse({ ...current, ...values })
      if (
        id &&
        current &&
        structuralFields.some((field) => current[field] !== reason[field])
      ) {
        await preserveOpenPause(tx, id)
      }
      await validateParent(tx, reason, id)
      if (id) {
        await validateChildren(tx, reason, id)
        if (reason.pause_step_kind === 'exit') {
          const outgoing = await tx.execute(sql`
            select 1 from public.pause_transitions
            where from_reason_id = ${id}
            limit 1
          `)
          if (outgoing.rows[0]) {
            throw invalid('Una salida no puede tener siguientes')
          }
        }
        await updateAdminRow(tx, 'reasons', id, values)
        return id
      }
      return insertAdminRow(tx, 'reasons', values)
    })
  } catch (error) {
    if (duplicateError(error))
      throw new AppError(
        409,
        'conflict',
        'Ya existe un motivo con ese nombre, uso y padre',
      )
    throw error
  }
}
