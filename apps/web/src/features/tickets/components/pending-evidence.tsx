import { Progress } from '@/components/ui/progress'
import { EVIDENCE_TYPES } from '../domain/types'
import { useLocalEvidence } from '../hooks/use-evidence'
import { evidenceTypeLabels, ticketMessages } from '../i18n'

/** Evidencias guardadas en el dispositivo que aún no se han subido. */
export function PendingEvidence({ ticketId }: { ticketId: string }) {
  const items = useLocalEvidence(ticketId)
  const pending = items.filter((item) => item.state !== 'uploaded')
  if (pending.length === 0) return null
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {pending.map((item) => {
        const type = EVIDENCE_TYPES.find((candidate) => candidate === item.type)
        const uploading = item.state === 'uploading'
        return (
          <li
            key={item.id}
            className="flex flex-col gap-1 rounded-lg border border-dashed p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span>{type ? evidenceTypeLabels[type] : item.type}</span>
              <span
                className="text-xs text-amber-700 dark:text-amber-400"
                aria-live="polite"
              >
                {uploading
                  ? `${item.progress}%`
                  : ticketMessages.evidence.pending}
              </span>
            </div>
            {uploading ? (
              <Progress value={item.progress} className="h-2" />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
