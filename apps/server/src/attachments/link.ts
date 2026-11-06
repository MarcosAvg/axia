import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from '../tickets/db.js'
import { writeEvent } from '../tickets/events.js'
import type { AttachmentMimeType } from './types.js'

export type LinkedAttachment = {
  attachmentId: string
  fileName: string
  mimeType: string
}

type AttachmentRow = {
  id: string
  ticket_id: string | null
  uploaded_by: string
  processing_state: string
  mime_type: string | null
  original_name: string
}

const LINKED = new AppError(
  422,
  'attachment_already_linked',
  'El adjunto ya está ligado a otro tiquet',
)
const INVALID = new AppError(
  422,
  'attachment_invalid',
  'El adjunto no está listo o no corresponde al problema',
)

type LinkInput = {
  tx: DbExecutor
  actor: Actor
  ticketId: string
  attachmentId: string
  allowed: AttachmentMimeType[]
}

/**
 * Liga un adjunto listo al tiquet dentro de la transacción de la acción.
 * Si algo falla, la transacción revierte el tiquet o la recaptura completa.
 */
export async function linkAttachment({
  tx,
  actor,
  ticketId,
  attachmentId,
  allowed,
}: LinkInput): Promise<LinkedAttachment> {
  const result = await tx.execute(sql`
    select id, ticket_id, uploaded_by, processing_state, mime_type, original_name
    from public.ticket_attachments
    where id = ${attachmentId}
    for update
  `)
  const row = result.rows[0] as AttachmentRow | undefined
  if (!row || row.uploaded_by !== actor.id) {
    throw new AppError(404, 'not_found', 'Adjunto no encontrado')
  }
  if (row.ticket_id !== null) throw LINKED
  if (
    row.processing_state !== 'ready' ||
    !row.mime_type ||
    !allowed.includes(row.mime_type as AttachmentMimeType)
  ) {
    throw INVALID
  }

  const updated = await tx.execute(sql`
    update public.ticket_attachments
    set ticket_id = ${ticketId}, linked_at = now()
    where id = ${attachmentId} and ticket_id is null
    returning id
  `)
  if (!updated.rows[0]) throw LINKED

  return {
    attachmentId: row.id,
    fileName: row.original_name,
    mimeType: row.mime_type,
  }
}

/** ¿El tiquet ya tiene un adjunto listo de alguno de los tipos permitidos? */
export async function findSatisfyingAttachment(
  tx: DbExecutor,
  ticketId: string,
  allowed: AttachmentMimeType[],
): Promise<boolean> {
  if (allowed.length === 0) return false
  const list = sql.join(
    allowed.map((mime) => sql`${mime}`),
    sql`, `,
  )
  const result = await tx.execute(sql`
    select 1
    from public.ticket_attachments
    where ticket_id = ${ticketId}
      and processing_state = 'ready'
      and mime_type in (${list})
    limit 1
  `)
  return Boolean(result.rows[0])
}

export async function writeAttachmentEvent(
  tx: DbExecutor,
  actor: Actor,
  ticketId: string,
  linked: LinkedAttachment,
): Promise<void> {
  await writeEvent(tx, {
    ticketId,
    type: 'attachment_added',
    actorId: actor.id,
    clientRequestId: null,
    payload: {
      attachmentId: linked.attachmentId,
      fileName: linked.fileName,
      mimeType: linked.mimeType,
    },
  })
}
