import { FormSection } from '@/components/shared/form-section'
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
  fixedDependencyId?: string
  fixedDependencyName?: string | null
  placeDisabled: boolean
  needsRequester: boolean
}

/** Secciones de la captura del tiquet: solicitante, ubicación, clasificación y descripción. */
export function TicketCaptureFields({
  register,
  errors,
  catalogs,
  canChooseRequester,
  ownRequesterName,
  fixedDependencyId,
  fixedDependencyName,
  placeDisabled,
  needsRequester,
}: TicketCaptureFieldsProps) {
  const { sections } = ticketMessages.create

  return (
    <>
      <FormSection
        title={sections.requester}
        description={sections.requesterHelp}
      >
        <TicketRequesterFields
          register={register}
          errors={errors}
          requesters={catalogs.requesters}
          canChooseRequester={canChooseRequester}
          ownRequesterName={ownRequesterName}
        />
      </FormSection>
      <FormSection
        title={sections.location}
        description={sections.locationHelp}
      >
        <TicketLocationFields
          register={register}
          errors={errors}
          buildings={catalogs.buildings}
          locations={catalogs.locations}
          dependencies={catalogs.dependencies}
          fixedDependencyId={fixedDependencyId}
          fixedDependencyName={fixedDependencyName}
          disabled={placeDisabled}
          needsRequester={needsRequester}
        />
      </FormSection>
      <FormSection
        title={sections.classification}
        description={sections.classificationHelp}
      >
        <TicketClassificationFields
          register={register}
          errors={errors}
          categories={catalogs.categories}
          subcategories={catalogs.subcategories}
          problems={catalogs.problems}
          channels={catalogs.channels}
          showChannel={canChooseRequester}
        />
      </FormSection>
    </>
  )
}
