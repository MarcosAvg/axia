import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listTicketAttachments,
  reserveAttachment,
  uploadAttachment,
} from '../api/attachments-api'

const attachmentKeys = {
  list: (ticketId: string) => ['tickets', 'attachments', ticketId] as const,
}

export interface UploadAttachmentInput {
  problemId: string
  ticketId?: string
  file: File
  clientRequestId?: string
  onProgress?: (percentage: number) => void
}

/** Reserva y sube un adjunto. Devuelve el id que se envía al alta o la recaptura. */
export function useUploadAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      problemId,
      ticketId,
      file,
      clientRequestId,
      onProgress,
    }: UploadAttachmentInput) => {
      const reservation = await reserveAttachment({
        clientRequestId: clientRequestId ?? crypto.randomUUID(),
        problemId,
        ticketId,
        fileName: file.name,
        declaredMimeType: file.type,
        sizeBytes: file.size,
      })
      await uploadAttachment(reservation, file, onProgress)
      return reservation.attachment.id
    },
    onSuccess: (_id, variables) => {
      if (variables.ticketId) {
        void queryClient.invalidateQueries({
          queryKey: attachmentKeys.list(variables.ticketId),
        })
      }
    },
  })
}

/** Adjuntos ligados al tiquet, visibles para quien puede ver el tiquet. */
export function useTicketAttachments(ticketId: string | undefined) {
  return useQuery({
    queryKey: attachmentKeys.list(ticketId ?? ''),
    queryFn: () => listTicketAttachments(ticketId ?? ''),
    enabled: Boolean(ticketId),
    staleTime: 60 * 1000,
  })
}
