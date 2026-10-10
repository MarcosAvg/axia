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
  channelId: '',
  description: '',
  requesterId: '',
}

/** Lógica del alta de tiquet: formulario, catálogos y registro. */
export function useCreateTicketForm() {
  const { identity } = useAuth()
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues,
  })
  const buildingId = useWatch({ control: form.control, name: 'buildingId' })
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const subcategoryId = useWatch({
    control: form.control,
    name: 'subcategoryId',
  })

  const catalogs = useCreateTicketCatalogs(
    buildingId || undefined,
    categoryId || undefined,
    subcategoryId || undefined,
  )
  const canChooseRequester = can(identity, 'ticket.create_on_behalf')
  const ownRequester = catalogs.requesters.find(
    (requester) => requester.userId === identity?.userId,
  )

  useEffect(() => {
    if (ownRequester && !form.getValues('requesterId')) {
      form.setValue('requesterId', ownRequester.id)
    }
  }, [ownRequester, form])

  const [photo, setPhoto] = useState<File | null>(null)
  const submission = useCreateTicketSubmission(form, photo)

  return {
    form,
    catalogs,
    canChooseRequester,
    ownRequester,
    photo,
    setPhoto,
    ...submission,
  }
}
