import { SelectField } from '@/components/shared/form-fields'
import type { RequesterOption } from '@/features/catalogs'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CreateTicketInput } from '../schemas'
import { ticketMessages } from '../i18n'

interface TicketRequesterFieldsProps {
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
  requesters: RequesterOption[]
  canChooseRequester: boolean
  ownRequesterName: string | null
}

/** Solicitante del alta: del catálogo (con la opción de elegirse a sí mismo). */
export function TicketRequesterFields({
  register,
  errors,
  requesters,
  canChooseRequester,
  ownRequesterName,
}: TicketRequesterFieldsProps) {
  const { fields } = ticketMessages.create

  if (!canChooseRequester) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{fields.requester}</span>
        <span className="text-muted-foreground">
          {ownRequesterName ?? ticketMessages.create.requesterSelf}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <SelectField
        id="requesterId"
        label={fields.requester}
        placeholder={fields.selectPlaceholder}
        options={requesters.map((requester) => ({
          value: requester.id,
          label: requester.fullName,
        }))}
        error={errors.requesterId?.message}
        {...register('requesterId')}
      />
      <p className="text-xs text-muted-foreground">
        {ticketMessages.create.requesterFromCatalog}
      </p>
    </div>
  )
}
