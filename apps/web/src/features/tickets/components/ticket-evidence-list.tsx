import { formatBytes, formatDateTime } from '@/lib/format'
import type { TicketEvidenceItem } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'
import { useEvidenceUrl } from '../hooks/use-evidence'

function EvidenceItem({ evidence }: { evidence: TicketEvidenceItem }) {
  const { data: url } = useEvidenceUrl(evidence.id)
  const isImage = evidence.mimeType?.startsWith('image/') ?? false

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{evidenceTypeLabels[evidence.type]}</span>
        <span className="text-xs text-muted-foreground">
          {formatDateTime(evidence.occurredAt)}
        </span>
      </div>
      {url && isImage ? (
        <img
          src={url}
          alt={evidenceTypeLabels[evidence.type]}
          className="max-h-56 w-full rounded-md object-cover"
        />
      ) : null}
      {url && !isImage ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          {evidence.mimeType ?? 'Archivo'}
        </a>
      ) : null}
      {evidence.sizeBytes !== null ? (
        <span className="text-xs text-muted-foreground">
          {formatBytes(evidence.sizeBytes)}
        </span>
      ) : null}
    </li>
  )
}

/** Lista de evidencias del tiquet con enlaces firmados. */
export function TicketEvidenceList({ items }: { items: TicketEvidenceItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ticketMessages.detail.noEvidence}
      </p>
    )
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((evidence) => (
        <EvidenceItem key={evidence.id} evidence={evidence} />
      ))}
    </ul>
  )
}
