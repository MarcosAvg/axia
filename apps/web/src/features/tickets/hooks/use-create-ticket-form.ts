import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { can, useAuth } from '@/features/auth'
import { createTicketSchema } from '../schemas'
import type { CreateTicketInput } from '../schemas'
import { useCreateTicketCatalogs } from './use-create-ticket-catalogs'
import { useCreateTicketSubmission } from './use-create-ticket-submission'

const defaultValues: CreateTicketInput = {
  buildingId: '',
  locationId: '',
  dependencyId: '',
  categoryId: '',
  subcategoryId: '',
  problemId: '',
  channelId: '',
  description: '',
  requesterId: '',
  occurredAt: '',
}

/** Lógica del alta de tiquet: formulario, catálogos y registro. */
export function useCreateTicketForm() {
  const { identity } = useAuth()
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues,
  })
  const buildingId = useWatch({ control: form.control, name: 'buildingId' })
  const locationId = useWatch({ control: form.control, name: 'locationId' })
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const subcategoryId = useWatch({
    control: form.control,
    name: 'subcategoryId',
  })
  const requesterId = useWatch({ control: form.control, name: 'requesterId' })

  const catalogs = useCreateTicketCatalogs(
    buildingId || undefined,
    locationId || undefined,
    categoryId || undefined,
    subcategoryId || undefined,
  )
  const canChooseRequester = can(identity, 'ticket.create_on_behalf')
  const canAdjustTime = can(identity, 'time.record_manual')
  const ownRequester = catalogs.requesters.find(
    (requester) => requester.userId === identity?.userId,
  )
  const showOccurredAt =
    canAdjustTime &&
    canChooseRequester &&
    Boolean(requesterId) &&
    requesterId !== ownRequester?.id

  useEffect(() => {
    if (ownRequester && !form.getValues('requesterId')) {
      form.setValue('requesterId', ownRequester.id)
    }
  }, [ownRequester, form])

  useEffect(() => {
    form.setValue('locationId', '')
    form.setValue('dependencyId', '')
  }, [buildingId, form])

  useEffect(() => {
    form.setValue('dependencyId', '')
  }, [locationId, form])

  useEffect(() => {
    if (!showOccurredAt && form.getValues('occurredAt')) {
      form.setValue('occurredAt', '')
    }
  }, [showOccurredAt, form])

  const [photo, setPhoto] = useState<File | null>(null)
  const submission = useCreateTicketSubmission(form, photo)

  return {
    form,
    catalogs,
    canChooseRequester,
    showOccurredAt,
    ownRequester,
    photo,
    setPhoto,
    ...submission,
  }
}
