import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useAuth } from '@/features/auth'
import type { ActionValues } from '../domain/action-values'
import type { ActionKey, ProxySubject } from '../domain/actions'
import {
  actionDraftKey,
  deleteActionDraft,
  readActionDraft,
  writeActionDraft,
} from '../hooks/action-draft'

export function useFieldDraft(
  ticketId: string,
  cycle: number,
  action: ActionKey,
  subject: ProxySubject,
) {
  const { session } = useAuth()
  const owner = session?.user.id
  const key =
    owner && (action === 'start' || action === 'pause')
      ? actionDraftKey(owner, ticketId, cycle, { name: action, subject })
      : null
  const draft = useLiveQuery(
    async () => (key ? ((await readActionDraft(key)) ?? null) : null),
    [key],
  )
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(false)

  function save(values: ActionValues, file: File | null) {
    setEditing(true)
    if (!key) return
    void writeActionDraft(key, values, file).then(
      () => setError(false),
      () => setError(true),
    )
  }

  async function clear() {
    if (!key) return
    try {
      await deleteActionDraft(key)
      setEditing(false)
    } catch {
      setError(true)
    }
  }

  return {
    saved: editing ? undefined : draft,
    loading: Boolean(key && draft === undefined),
    save,
    clear,
    resume: () => setEditing(true),
    error,
  }
}
