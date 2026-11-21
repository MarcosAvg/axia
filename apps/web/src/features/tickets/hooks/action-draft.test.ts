import 'fake-indexeddb/auto'
import { db } from '@/lib/offline/db'
import { EMPTY_ACTION_VALUES } from '../domain/action-values'
import {
  actionDraftKey,
  readActionDraft,
  writeActionDraft,
} from './action-draft'

it('restaura el borrador del mismo usuario y ciclo con su foto', async () => {
  const key = actionDraftKey('owner', 'ticket', 1, {
    name: 'start',
    subject: null,
  })
  const file = new File(['foto'], 'antes.jpg', { type: 'image/jpeg' })
  await writeActionDraft(key, { ...EMPTY_ACTION_VALUES, note: 'motor' }, file)
  expect((await readActionDraft(key))?.values.note).toBe('motor')
  expect((await readActionDraft(key))?.photo?.name).toBe('antes.jpg')
  expect(
    await readActionDraft(
      actionDraftKey('other', 'ticket', 1, { name: 'start', subject: null }),
    ),
  ).toBeUndefined()
  expect(
    await readActionDraft(
      actionDraftKey('owner', 'ticket', 2, { name: 'start', subject: null }),
    ),
  ).toBeUndefined()
  await db.actionDrafts.clear()
})

it('recupera para revisión los borradores de ciclos anteriores del mismo tiquet', async () => {
  const { readTicketActionDrafts } = await import('./action-draft')
  const owner = actionDraftKey('owner', 'ticket', 1, {
    name: 'pause',
    subject: null,
  })
  const other = actionDraftKey('other', 'ticket', 1, {
    name: 'pause',
    subject: null,
  })
  await writeActionDraft(
    owner,
    { ...EMPTY_ACTION_VALUES, note: 'nota anterior' },
    null,
  )
  await writeActionDraft(
    other,
    { ...EMPTY_ACTION_VALUES, note: 'otra cuenta' },
    null,
  )
  try {
    expect(await readTicketActionDrafts('owner', 'ticket')).toEqual([
      expect.objectContaining({
        key: owner,
        cycle: 1,
        action: 'pause',
        note: 'nota anterior',
      }),
    ])
  } finally {
    await db.actionDrafts.clear()
  }
})
