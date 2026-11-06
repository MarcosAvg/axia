import { DownloadIcon, FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes, formatDateTime } from '@/lib/format'
import { getAttachmentUrl } from '../api/attachments-api'
import { attachmentTypeLabel } from '../domain/attachments'
import type { TicketAttachment } from '../domain/types'
import { ticketMessages } from '../i18n'

function AttachmentItem({ attachment }: { attachment: TicketAttachment }) {
  const meta = [
    attachmentTypeLabel(attachment.mimeType),
    formatBytes(attachment.sizeBytes),
    formatDateTime(attachment.createdAt),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {attachment.fileName}
        </span>
        <span className="text-xs text-muted-foreground">{meta}</span>
        <span className="text-xs text-muted-foreground">
          {attachment.uploadedByName}
        </span>
      </div>
      <Button asChild variant="outline" size="sm" className="min-h-11">
        <a href={getAttachmentUrl(attachment.id)} download>
          <DownloadIcon />
          {ticketMessages.detail.download}
        </a>
      </Button>
    </li>
  )
}

/** Adjuntos ligados al tiquet, sin vista previa ni miniatura. */
export function TicketAttachmentsList({
  items,
}: {
  items: TicketAttachment[]
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ticketMessages.detail.noAttachments}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment} />
      ))}
    </ul>
  )
}
