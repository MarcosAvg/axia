import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { toTicketError } from '../domain/errors'
import type { DuplicateCandidate } from '../domain/types'
import type { CreateTicketInput } from '../schemas'
import { useCheckDuplicates, useCreateTicket } from './use-tickets'

interface PendingDuplicates {
  input: CreateTicketInput
  candidates: DuplicateCandidate[]
}

/** Registro del tiquet con pre-chequeo de duplicados y confirmación. */
export function useCreateTicketSubmission(
  form: UseFormReturn<CreateTicketInput>,
) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingDuplicates | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [allowLeave, setAllowLeave] = useState(false)
  const createMutation = useCreateTicket()
  const checkMutation = useCheckDuplicates()

  function createWith(input: CreateTicketInput) {
    setAllowLeave(true)
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
        setPending({ input: values, candidates: found })
      } else {
        createWith(values)
      }
    } catch (error) {
      setSubmitError(toTicketError(error).message)
    }
  })

  function confirmDuplicate() {
    if (pending) createWith(pending.input)
    setPending(null)
  }

  function cancelDuplicate() {
    setPending(null)
  }

  return {
    candidates: pending?.candidates ?? [],
    onSubmit,
    confirmDuplicate,
    cancelDuplicate,
    submitError,
    allowLeave,
    isSubmitting: createMutation.isPending || checkMutation.isPending,
    createError: createMutation.error
      ? toTicketError(createMutation.error)
      : null,
  }
}
