import { Maximize2Icon } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { TicketEvidenceItem } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'
import { useEvidenceUrl } from '../hooks/use-evidence'

function evidenceMeta(evidence: TicketEvidenceItem): string {
  const meta = [formatDateTime(evidence.occurredAt)]
  if (evidence.sizeBytes !== null) meta.push(formatBytes(evidence.sizeBytes))
  return meta.join(' · ')
}

function EvidenceImage({
  evidence,
  url,
}: {
  evidence: TicketEvidenceItem
  url: string
}) {
  const [open, setOpen] = useState(false)
  const label = evidenceTypeLabels[evidence.type]

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${ticketMessages.evidence.view}: ${label}`}
        className="group relative w-full overflow-hidden rounded-md border bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
      >
        <img src={url} alt="" className="h-48 w-full object-contain" />
        <span
          aria-hidden
          className="absolute top-2 right-2 rounded-md bg-background/90 p-1 shadow-sm"
        >
          <Maximize2Icon className="size-4" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[min(96vw,72rem)] gap-2 p-2 sm:max-w-[min(96vw,72rem)]">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{evidenceMeta(evidence)}</DialogDescription>
          </DialogHeader>
          <img
            src={url}
            alt={label}
            className="max-h-[78vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

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
      {url && isImage ? <EvidenceImage evidence={evidence} url={url} /> : null}
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

/** Lista de evidencias del tiquet con miniaturas y visor ampliado. */
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
