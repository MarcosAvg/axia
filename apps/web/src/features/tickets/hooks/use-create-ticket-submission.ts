import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { saveAndUploadEvidence } from '../api/offline-evidence'
import { toTicketError } from '../domain/errors'
import { ticketMessages } from '../i18n'
import type { DuplicateCandidate } from '../domain/types'
import type { CreateTicketInput } from '../schemas'
import { useUploadAttachment } from './use-attachments'
import { useCheckDuplicates, useCreateTicket } from './use-tickets'

interface PendingDuplicates {
  input: CreateTicketInput
  candidates: DuplicateCandidate[]
}

type DuplicateCheck = ReturnType<typeof useCheckDuplicates>

type UploadResult = { attachmentId?: string; error?: string }

async function findDuplicates(
  check: DuplicateCheck,
  values: CreateTicketInput,
): Promise<DuplicateCandidate[]> {
  return check.mutateAsync({
    buildingId: values.buildingId,
    locationId: values.locationId,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId || undefined,
    problemId: values.problemId || undefined,
    dependencyId: values.dependencyId,
    description: values.description,
  })
}

async function uploadRequestPhoto(
  ticketId: string,
  photo: File | null,
  input: CreateTicketInput,
) {
  if (!photo) return
  try {
    await saveAndUploadEvidence({
      ticketId,
      cycle: 1,
      type: 'request',
      file: photo,
      occurredAt: input.occurredAt
        ? new Date(input.occurredAt).toISOString()
        : undefined,
    })
  } catch (error) {
    console.warn('No se pudo subir la foto de la solicitud', error)
    toast.error(ticketMessages.create.photoError)
  }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function useRequiredAttachmentUploader(
  attachment: File | null,
  requiredTypes: string[],
) {
  const upload = useUploadAttachment()
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  async function uploadFor(problemId: string): Promise<UploadResult> {
    if (requiredTypes.length === 0) return {}
    if (!attachment) {
      return { error: ticketMessages.create.attachmentRequired }
    }
    if (isOffline()) {
      return { error: ticketMessages.create.attachmentOffline }
    }
    try {
      setIsUploading(true)
      setProgress(0)
      const attachmentId = await upload.mutateAsync({
        problemId,
        file: attachment,
        onProgress: setProgress,
      })
      return { attachmentId }
    } catch {
      return { error: ticketMessages.create.attachmentError }
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadFor, isUploading, progress }
}

type CreateMutation = ReturnType<typeof useCreateTicket>
type Navigate = ReturnType<typeof useNavigate>

type CreateActionContext = {
  navigate: Navigate
  photo: File | null
  uploader: ReturnType<typeof useRequiredAttachmentUploader>
  createMutation: CreateMutation
  setAllowLeave: (value: boolean) => void
  setSubmitError: (value: string | null) => void
}

function useCreateTicketAction({
  navigate,
  photo,
  uploader,
  createMutation,
  setAllowLeave,
  setSubmitError,
}: CreateActionContext) {
  return async function createWith(
    input: CreateTicketInput,
    shownCandidateIds?: string[],
  ) {
    setSubmitError(null)
    const uploaded = await uploader.uploadFor(input.problemId)
    if (uploaded.error) {
      setSubmitError(uploaded.error)
      return
    }
    setAllowLeave(true)
    createMutation.mutate(
      {
        input,
        clientRequestId: crypto.randomUUID(),
        shownCandidateIds,
        attachmentId: uploaded.attachmentId,
      },
      {
        onSuccess: async (ticketId) => {
          await uploadRequestPhoto(ticketId, photo, input)
          void navigate({ to: '/tickets/$ticketId', params: { ticketId } })
        },
      },
    )
  }
}

type CreateWith = (
  input: CreateTicketInput,
  shownCandidateIds?: string[],
) => Promise<void>

function usePendingDuplicates(createWith: CreateWith) {
  const [pending, setPending] = useState<PendingDuplicates | null>(null)
  function confirmDuplicate() {
    if (!pending) return
    const current = pending
    setPending(null)
    void createWith(
      current.input,
      current.candidates.map((candidate) => candidate.id),
    )
  }
  function cancelDuplicate() {
    setPending(null)
  }
  return { pending, setPending, confirmDuplicate, cancelDuplicate }
}

/** Registro del tiquet con pre-chequeo de duplicados, adjunto y confirmación. */
export function useCreateTicketSubmission(
  form: UseFormReturn<CreateTicketInput>,
  photo: File | null,
  attachment: File | null,
  requiredTypes: string[],
) {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [allowLeave, setAllowLeave] = useState(false)
  const createMutation = useCreateTicket()
  const checkMutation = useCheckDuplicates()
  const uploader = useRequiredAttachmentUploader(attachment, requiredTypes)
  const createWith = useCreateTicketAction({
    navigate,
    photo,
    uploader,
    createMutation,
    setAllowLeave,
    setSubmitError,
  })
  const duplicates = usePendingDuplicates(createWith)

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const found = await findDuplicates(checkMutation, values)
      if (found.length > 0) {
        duplicates.setPending({ input: values, candidates: found })
      } else {
        await createWith(values)
      }
    } catch (error) {
      setSubmitError(toTicketError(error).message)
    }
  })

  return {
    candidates: duplicates.pending?.candidates ?? [],
    onSubmit,
    confirmDuplicate: duplicates.confirmDuplicate,
    cancelDuplicate: duplicates.cancelDuplicate,
    submitError,
    allowLeave,
    isUploadingAttachment: uploader.isUploading,
    attachmentProgress: uploader.progress,
    isSubmitting:
      createMutation.isPending ||
      checkMutation.isPending ||
      uploader.isUploading,
    createError: createMutation.error
      ? toTicketError(createMutation.error)
      : null,
  }
}
