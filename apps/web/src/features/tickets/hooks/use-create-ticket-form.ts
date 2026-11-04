import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useRequesters } from '@/features/catalogs'
import type { RequesterOption } from '@/features/catalogs'
import { effectiveRequester } from '../domain/place'
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

type PlaceSelection = {
  ownRequester: RequesterOption | undefined
  selectedRequesterId: string | undefined
  fixedDependencyId: string
  fixedDependencyName: string | null
  placeDisabled: boolean
  needsRequester: boolean
  canChooseRequester: boolean
}

function usePlaceSelection(
  identity: Identity | null,
  requesterId: string,
  requestersQuery: { data?: RequesterOption[]; isLoading: boolean },
): PlaceSelection {
  const requesters = requestersQuery.data ?? []
  const ownRequester = requesters.find(
    (requester) => requester.userId === identity?.userId,
  )
  const selectedRequester = effectiveRequester(
    requesters,
    requesterId,
    ownRequester?.id ?? null,
  )
  const canChooseRequester = can(identity, 'ticket.create_on_behalf')
  let fixedDependencyId = ''
  let fixedDependencyName: string | null = null
  let placeDisabled = true
  let needsRequester = false
  if (selectedRequester) {
    fixedDependencyId = selectedRequester.dependencyId ?? ''
    fixedDependencyName = selectedRequester.dependencyName
    placeDisabled = false
  } else if (canChooseRequester && !requestersQuery.isLoading) {
    needsRequester = true
  }
  return {
    ownRequester,
    selectedRequesterId: selectedRequester?.id,
    fixedDependencyId,
    fixedDependencyName,
    placeDisabled,
    needsRequester,
    canChooseRequester,
  }
}

function canSetOccurredAt(
  canAdjustTime: boolean,
  canChooseRequester: boolean,
  requesterId: string,
  ownRequesterId: string | undefined,
): boolean {
  return (
    canAdjustTime &&
    canChooseRequester &&
    Boolean(requesterId) &&
    requesterId !== ownRequesterId
  )
}

function usePlaceEffects(
  form: UseFormReturn<CreateTicketInput>,
  selection: Pick<
    PlaceSelection,
    'ownRequester' | 'selectedRequesterId' | 'fixedDependencyId'
  >,
  place: { buildingId: string; locationId: string },
) {
  const { ownRequester, selectedRequesterId, fixedDependencyId } = selection
  const { buildingId, locationId } = place

  useEffect(() => {
    if (ownRequester && !form.getValues('requesterId')) {
      form.setValue('requesterId', ownRequester.id)
    }
  }, [ownRequester, form])

  useEffect(() => {
    form.setValue('buildingId', '')
    form.setValue('locationId', '')
    form.setValue('dependencyId', fixedDependencyId)
  }, [selectedRequesterId, fixedDependencyId, form])

  useEffect(() => {
    form.setValue('locationId', '')
    if (!fixedDependencyId) form.setValue('dependencyId', '')
  }, [buildingId, fixedDependencyId, form])

  useEffect(() => {
    if (!fixedDependencyId) form.setValue('dependencyId', '')
  }, [locationId, fixedDependencyId, form])
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

  const requestersQuery = useRequesters()
  const selection = usePlaceSelection(identity, requesterId, requestersQuery)
  const catalogs = useCreateTicketCatalogs({
    dependencyId: selection.fixedDependencyId || undefined,
    buildingId: buildingId || undefined,
    locationId: locationId || undefined,
    categoryId: categoryId || undefined,
    subcategoryId: subcategoryId || undefined,
  })
  const canAdjustTime = can(identity, 'time.record_manual')
  const showOccurredAt = canSetOccurredAt(
    canAdjustTime,
    selection.canChooseRequester,
    requesterId,
    selection.ownRequester?.id,
  )

  usePlaceEffects(form, selection, { buildingId, locationId })

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
    ...selection,
    showOccurredAt,
    photo,
    setPhoto,
    ...submission,
  }
}
