import type { Actor } from '../auth/authorization.js'
import { linkAttachment, type LinkedAttachment } from '../attachments/link.js'
import { problemAttachmentTypes } from '../attachments/requirements.js'
import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'

export async function linkRequiredAttachment({
  tx,
  actor,
  ticketId,
  problemId,
  attachmentId,
}: {
  tx: DbExecutor
  actor: Actor
  ticketId: string
  problemId: string
  attachmentId: string | undefined
}): Promise<LinkedAttachment | null> {
  const required = await problemAttachmentTypes(tx, problemId)
  if (required.length === 0) {
    if (attachmentId) {
      throw new AppError(
        422,
        'attachment_not_required',
        'Este problema no admite adjunto',
      )
    }
    return null
  }
  if (!attachmentId) {
    throw new AppError(
      422,
      'attachment_required',
      'Este problema exige adjuntar un archivo',
    )
  }
  return linkAttachment({
    tx,
    actor,
    ticketId,
    attachmentId,
    allowed: required,
  })
}
