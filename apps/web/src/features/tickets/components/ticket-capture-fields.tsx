import { FormSection } from '@/components/shared/form-section'
import type {
  FieldErrors,
  UseFormRegister,
  UseFormReturn,
} from 'react-hook-form'
import type { CreateTicketInput } from '../schemas'
import type { CreateTicketCatalogs } from '../hooks/use-create-ticket-catalogs'
import { ticketMessages } from '../i18n'
import { TicketClassificationFields } from './ticket-classification-fields'
import { TicketLocationFields } from './ticket-location-fields'
import { TicketRequesterFields } from './ticket-requester-fields'

interface TicketCaptureFieldsProps {
  form: UseFormReturn<CreateTicketInput>
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
  catalogs: CreateTicketCatalogs
  canChooseRequester: boolean
  ownRequesterName: string | null
  ownRegistration: boolean
  fixedDependencyId?: string
  fixedDependencyName?: string | null
  placeDisabled: boolean
  needsRequester: boolean
}

function CaptureClassification({
  form,
  catalogs,
  canChooseRequester,
  ownRegistration,
}: Pick<
  TicketCaptureFieldsProps,
  'form' | 'catalogs' | 'canChooseRequester' | 'ownRegistration'
>) {
  const { sections } = ticketMessages.create
  return (
    <FormSection
      title={sections.classification}
      description={sections.classificationHelp}
    >
      <TicketClassificationFields
        form={form}
        categories={catalogs.categories}
        subcategories={catalogs.subcategories}
        problems={catalogs.problems}
        channels={catalogs.channels}
        showChannel={canChooseRequester && !ownRegistration}
        platformChannelName={
          ownRegistration ? catalogs.platformChannelName : undefined
        }
      />
    </FormSection>
  )
}

/** Secciones de la captura del tiquet: solicitante, ubicación, clasificación y descripción. */
export function TicketCaptureFields({
  form,
  register,
  errors,
  catalogs,
  canChooseRequester,
  ownRequesterName,
  ownRegistration,
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
      <CaptureClassification
        form={form}
        catalogs={catalogs}
        canChooseRequester={canChooseRequester}
        ownRegistration={ownRegistration}
      />
    </>
  )
}
