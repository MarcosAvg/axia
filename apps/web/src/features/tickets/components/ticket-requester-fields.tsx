import { SelectField, TextField } from '@/components/shared/form-fields'
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

export function TicketRequesterFields({
  register,
  errors,
  requesters,
  canChooseRequester,
  ownRequesterName,
}: TicketRequesterFieldsProps) {
  const { fields } = ticketMessages.create

  return (
    <fieldset className="flex flex-col gap-4">
      {canChooseRequester ? (
        <>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="requesterName"
              label={fields.requesterName}
              error={errors.requesterName?.message}
              {...register('requesterName')}
            />
            <TextField
              id="requesterContact"
              label={fields.requesterContact}
              error={errors.requesterContact?.message}
              {...register('requesterContact')}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{fields.requester}</span>
          <span className="text-muted-foreground">
            {ownRequesterName ?? ticketMessages.create.requesterSelf}
          </span>
        </div>
      )}
    </fieldset>
  )
}
