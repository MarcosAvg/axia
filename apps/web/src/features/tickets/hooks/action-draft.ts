import { db } from '@/lib/offline/db'
import type { ActionValues } from '../domain/action-values'

export function actionDraftKey(
  userId: string,
  ticketId: string,
  cycle: number,
  action: { name: string; subject: unknown },
) {
  return JSON.stringify([userId, ticketId, cycle, action.name, action.subject])
}

export async function readActionDraft(key: string) {
  const draft = await db.actionDrafts.get(key)
  if (!draft) return undefined
  const { photo } = draft
  return {
    values: draft.values as ActionValues,
    photo: photo
      ? new File([photo.blob], photo.name, { type: photo.blob.type })
      : null,
  }
}

export function writeActionDraft(
  key: string,
  values: ActionValues,
  file: File | null,
) {
  return db.actionDrafts.put({
    key,
    values,
    photo: file
      ? { blob: file.slice(0, file.size, file.type), name: file.name }
      : null,
  })
}

export function deleteActionDraft(key: string) {
  return db.actionDrafts.delete(key)
}

export async function readTicketActionDrafts(userId: string, ticketId: string) {
  const prefix = `${JSON.stringify([userId, ticketId]).slice(0, -1)},`
  const drafts = await db.actionDrafts.where('key').startsWith(prefix).toArray()
  return drafts.map(({ key, values, photo }) => {
    const [, , cycle, action] = JSON.parse(key) as [
      string,
      string,
      number,
      'start' | 'pause',
    ]
    const { note, text } = values as ActionValues
    return { key, cycle, action, note, text, photo }
  })
}
