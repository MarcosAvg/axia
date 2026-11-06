import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from '../tickets/db.js'
import { isAttachmentMimeType, type AttachmentMimeType } from './types.js'

type RuleRow = {
  attachment_required_types: unknown
  attachment_instructions: string | null
}

export type ProblemAttachmentRule = {
  types: AttachmentMimeType[]
  instructions: string | null
}

export function normalizeAttachmentTypes(value: unknown): AttachmentMimeType[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is AttachmentMimeType =>
      typeof item === 'string' && isAttachmentMimeType(item),
  )
}

/** Regla activa de un problema; falla si el problema no existe o está inactivo. */
export async function loadProblemAttachmentRule(
  tx: DbExecutor,
  problemId: string,
): Promise<ProblemAttachmentRule> {
  const result = await tx.execute(sql`
    select attachment_required_types, attachment_instructions
    from public.problems
    where id = ${problemId} and active
    limit 1
  `)
  const row = result.rows[0] as RuleRow | undefined
  if (!row) throw new AppError(400, 'validation_error', 'Problema no válido')
  return {
    types: normalizeAttachmentTypes(row.attachment_required_types),
    instructions: row.attachment_instructions,
  }
}

/** Tipos exigidos por un problema, sin fallar si el tiquet no tiene problema. */
export async function problemAttachmentTypes(
  tx: DbExecutor,
  problemId: string | null,
): Promise<AttachmentMimeType[]> {
  if (!problemId) return []
  const result = await tx.execute(sql`
    select attachment_required_types
    from public.problems
    where id = ${problemId}
    limit 1
  `)
  const row = result.rows[0] as
    { attachment_required_types: unknown } | undefined
  return row ? normalizeAttachmentTypes(row.attachment_required_types) : []
}
