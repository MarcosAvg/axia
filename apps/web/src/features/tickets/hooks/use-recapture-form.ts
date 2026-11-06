import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  useBuildings,
  useCategories,
  useDependencies,
  useLocations,
  usePriorities,
  useProblems,
  useReasons,
  useServiceTypes,
  useSubcategories,
} from '@/features/catalogs'
import {
  applyRecaptureChange,
  initialRecaptureValues,
  missingRecaptureFields,
  recaptureChanges,
} from '../domain/recapture'
import type { RecaptureValues } from '../domain/recapture'
import {
  needsRecaptureAttachment,
  recaptureAttachmentTypes,
} from '../domain/recapture-attachment'
import { uploadErrorMessage } from '../domain/attachments'
import { requiredTypesForProblem } from '../domain/attachments'
import type { TicketDetail } from '../domain/types'
import { technicianSubject } from '../domain/actions'
import { ticketMessages } from '../i18n'
import { useActionTime } from './use-action-time'
import { useTicketAttachments, useUploadAttachment } from './use-attachments'
import { useTicketActions } from './use-ticket-actions'

function dataOf<T>(query: { data?: T[] }): T[] {
  return query.data ?? []
}

function optional(value: string): string | undefined {
  return value ? value : undefined
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function useRecaptureCatalogs({
  requesterDependencyId,
  buildingId,
  categoryId,
  subcategoryId,
}: {
  requesterDependencyId: string | null
  buildingId: string
  categoryId: string
  subcategoryId: string
}) {
  const dependencyId = requesterDependencyId ?? undefined
  const buildings = useBuildings(dependencyId)
  const locations = useLocations(optional(buildingId), dependencyId)
  const dependencies = useDependencies()
  const categories = useCategories()
  const subcategories = useSubcategories(optional(categoryId))
  const problems = useProblems(optional(subcategoryId))
  const serviceTypes = useServiceTypes()
  const priorities = usePriorities()
  const reasons = useReasons('recapture')
  return {
    buildings: dataOf(buildings),
    locations: dataOf(locations),
    dependencies: dataOf(dependencies),
    categories: dataOf(categories),
    subcategories: dataOf(subcategories),
    problems: dataOf(problems),
    serviceTypes: dataOf(serviceTypes),
    priorities: dataOf(priorities),
    reasons: dataOf(reasons),
  }
}

function recaptureAttachmentInfo(
  ticket: TicketDetail,
  problemId: string,
  problems: ReturnType<typeof useRecaptureCatalogs>['problems'],
  attachedTypes: string[],
) {
  const problem = problems.find((item) => item.id === problemId)
  const requiredTypes = requiredTypesForProblem(problem)
  const needsFile = needsRecaptureAttachment({
    problemChanged: problemId !== (ticket.problemId ?? ''),
    requiredTypes,
    attachedTypes,
  })
  return { problem, requiredTypes, needsFile }
}

type UploadAttachment = ReturnType<typeof useUploadAttachment>

type UploadResult = { attachmentId?: string; error?: string }

type UploadRequest = {
  upload: UploadAttachment
  problemId: string
  ticketId: string
  attachment: File | null
  needsFile: boolean
  setIsUploading: (value: boolean) => void
  setProgress: (value: number) => void
}

async function uploadRequiredAttachment({
  upload,
  problemId,
  ticketId,
  attachment,
  needsFile,
  setIsUploading,
  setProgress,
}: UploadRequest): Promise<UploadResult> {
  if (!needsFile) return {}
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
      ticketId,
      file: attachment,
      onProgress: setProgress,
    })
    return { attachmentId }
  } catch (error) {
    return {
      error: uploadErrorMessage(error) ?? ticketMessages.create.attachmentError,
    }
  } finally {
    setIsUploading(false)
  }
}

function useRecaptureAttachment(
  ticket: TicketDetail,
  problemId: string,
  problems: ReturnType<typeof useRecaptureCatalogs>['problems'],
) {
  const attachments = useTicketAttachments(ticket.id)
  const upload = useUploadAttachment()
  const [state, setState] = useState<{ problemId: string; file: File | null }>({
    problemId: '',
    file: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const attachedTypes = (attachments.data ?? []).map((item) => item.mimeType)
  const { problem, requiredTypes, needsFile } = recaptureAttachmentInfo(
    ticket,
    problemId,
    problems,
    attachedTypes,
  )
  const attachment = state.problemId === problemId ? state.file : null
  const setAttachment = (file: File | null) => {
    setError(null)
    setState({ problemId, file })
  }
  const uploadIfNeeded = () =>
    uploadRequiredAttachment({
      upload,
      problemId,
      ticketId: ticket.id,
      attachment,
      needsFile,
      setIsUploading,
      setProgress,
    })

  return {
    attachment,
    setAttachment,
    attachmentTypes: recaptureAttachmentTypes(needsFile, requiredTypes),
    attachmentInstructions: problem?.attachmentInstructions ?? null,
    attachmentError: error,
    setAttachmentError: setError,
    isUploading,
    progress,
    uploadIfNeeded,
  }
}

type RecaptureAttachment = ReturnType<typeof useRecaptureAttachment>
type RecaptureActions = ReturnType<typeof useTicketActions>

function createRecaptureSubmit({
  values,
  attachment,
  actions,
  setHasError,
  onClose,
}: {
  values: RecaptureValues
  attachment: RecaptureAttachment
  actions: RecaptureActions
  setHasError: (value: boolean) => void
  onClose: () => void
}) {
  return async function submit(event: FormEvent) {
    event.preventDefault()
    if (missingRecaptureFields(values).length > 0) {
      setHasError(true)
      return
    }
    attachment.setAttachmentError(null)
    const uploaded = await attachment.uploadIfNeeded()
    if (uploaded.error) {
      attachment.setAttachmentError(uploaded.error)
      return
    }
    actions.recapture.mutate(
      {
        changes: recaptureChanges(values),
        reasonId: values.reasonId,
        note: values.note || undefined,
        attachmentId: uploaded.attachmentId,
      },
      { onSuccess: onClose },
    )
  }
}

/** Estado y catálogos de la recaptura. */
export function useRecaptureForm(
  ticket: TicketDetail,
  subjectTechnicianId: string | undefined,
  onClose: () => void,
) {
  const time = useActionTime(Boolean(subjectTechnicianId))
  const actions = useTicketActions(
    ticket.id,
    technicianSubject(subjectTechnicianId),
    time.iso,
  )
  const [values, setValues] = useState(() => initialRecaptureValues(ticket))
  const [hasError, setHasError] = useState(false)
  const requesterDependencyId = ticket.requesterDependencyId
  const catalogs = useRecaptureCatalogs({
    requesterDependencyId,
    buildingId: values.buildingId,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId,
  })
  const attachment = useRecaptureAttachment(
    ticket,
    values.problemId,
    catalogs.problems,
  )
  function change(name: keyof typeof values, value: string) {
    setValues((current) =>
      applyRecaptureChange(current, name, value, requesterDependencyId),
    )
  }

  const submit = createRecaptureSubmit({
    values,
    attachment,
    actions,
    setHasError,
    onClose,
  })

  return {
    values,
    change,
    submit,
    time,
    hasError,
    isPending: actions.recapture.isPending,
    mutationError: actions.recapture.error,
    attachment: attachment.attachment,
    setAttachment: attachment.setAttachment,
    attachmentTypes: attachment.attachmentTypes,
    attachmentInstructions: attachment.attachmentInstructions,
    attachmentError: attachment.attachmentError,
    isUploadingAttachment: attachment.isUploading,
    attachmentProgress: attachment.progress,
    catalogs: {
      ...catalogs,
      fixedDependencyId: requesterDependencyId,
      fixedDependencyName: ticket.requesterDependencyName,
    },
  }
}
