import { TextAreaField } from '@/components/shared/form-fields'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CreateTicketInput } from '../schemas'
import type { CreateTicketCatalogs } from '../hooks/use-create-ticket-catalogs'
import { ticketMessages } from '../i18n'
import { TicketClassificationFields } from './ticket-classification-fields'
import { TicketLocationFields } from './ticket-location-fields'
import { TicketRequesterFields } from './ticket-requester-fields'

interface TicketCaptureFieldsProps {
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
  catalogs: CreateTicketCatalogs
  canChooseRequester: boolean
  ownRequesterName: string | null
}

/** Campos de la captura del tiquet. */
export function TicketCaptureFields({
  register,
  errors,
  catalogs,
  canChooseRequester,
  ownRequesterName,
}: TicketCaptureFieldsProps) {
  return (
    <>
      <TicketLocationFields
        register={register}
        errors={errors}
        buildings={catalogs.buildings}
        locations={catalogs.locations}
        dependencies={catalogs.dependencies}
      />
      <TicketClassificationFields
        register={register}
        errors={errors}
        categories={catalogs.categories}
        subcategories={catalogs.subcategories}
        problems={catalogs.problems}
        serviceTypes={catalogs.serviceTypes}
        priorities={catalogs.priorities}
        channels={catalogs.channels}
      />
      <TicketRequesterFields
        register={register}
        errors={errors}
        requesters={catalogs.requesters}
        canChooseRequester={canChooseRequester}
        ownRequesterName={ownRequesterName}
      />
      <TextAreaField
        id="description"
        label={ticketMessages.create.fields.description}
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />
    </>
  )
}
