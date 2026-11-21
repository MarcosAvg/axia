import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'
import { downloadBlob } from '@/lib/download'
import type { ActionKey } from '../domain/actions'
import { readTicketActionDrafts } from '../hooks/action-draft'
import { ticketMessages } from '../i18n'

export function UnavailableActionDrafts({
  ticketId,
  cycle,
  actions,
}: {
  ticketId: string
  cycle: number
  actions: ActionKey[]
}) {
  const { session } = useAuth()
  const owner = session?.user.id
  const drafts = useLiveQuery(
    () => (owner ? readTicketActionDrafts(owner, ticketId) : []),
    [owner, ticketId],
    [],
  )
  const unavailable = drafts.filter(
    (draft) => draft.cycle !== cycle || !actions.includes(draft.action),
  )
  if (unavailable.length === 0) return null

  return (
    <details className="rounded-xl border p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Borradores para revisar ({unavailable.length})
      </summary>
      <p className="my-2 text-muted-foreground">
        La acción o el ciclo cambió. Revisa la captura antes de usarla en otra
        acción.
      </p>
      <ul className="space-y-2">
        {unavailable.map(
          ({ key, action, cycle: draftCycle, note, text, photo }) => (
            <li key={key} className="space-y-1 rounded-md border p-2">
              <p className="font-medium">
                {ticketMessages.actions[action]} · Ciclo {draftCycle}
              </p>
              {note ? <p className="whitespace-pre-wrap">{note}</p> : null}
              {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
              {photo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => downloadBlob(photo.name, photo.blob)}
                >
                  Guardar {photo.name}
                </Button>
              ) : null}
            </li>
          ),
        )}
      </ul>
    </details>
  )
}
