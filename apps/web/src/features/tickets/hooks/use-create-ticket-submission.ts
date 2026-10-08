import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { toTicketError } from '../domain/errors'
import type { DuplicateCandidate } from '../domain/types'
import type { CreateTicketInput } from '../schemas'
import { useCheckDuplicates, useCreateTicket } from './use-tickets'

/** Registro del tiquet con pre-chequeo de duplicados y confirmación. */
export function useCreateTicketSubmission(
  form: UseFormReturn<CreateTicketInput>,
) {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([])
  const [pending, setPending] = useState<CreateTicketInput | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createMutation = useCreateTicket()
  const checkMutation = useCheckDuplicates()

  function createWith(input: CreateTicketInput) {
    createMutation.mutate(
      { input, clientRequestId: crypto.randomUUID() },
      {
        onSuccess: (ticketId) => {
          void navigate({ to: '/tickets/$ticketId', params: { ticketId } })
        },
      },
    )
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const found = await checkMutation.mutateAsync({
        buildingId: values.buildingId,
        categoryId: values.categoryId,
        problemId: values.problemId,
        description: values.description,
      })
      if (found.length > 0) {
        setPending(values)
        setCandidates(found)
      } else {
        createWith(values)
      }
    } catch (error) {
      setSubmitError(toTicketError(error).message)
    }
  })

  function confirmDuplicate() {
    if (pending) createWith(pending)
    setCandidates([])
    setPending(null)
  }

  function cancelDuplicate() {
    setCandidates([])
    setPending(null)
  }

  return {
    candidates,
    onSubmit,
    confirmDuplicate,
    cancelDuplicate,
    submitError,
    isSubmitting: createMutation.isPending || checkMutation.isPending,
    createError: createMutation.error
      ? toTicketError(createMutation.error)
      : null,
  }
}
