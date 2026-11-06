import { Link } from '@tanstack/react-router'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { FormActionsBar } from '@/components/shared/form-actions-bar'
import { FileField } from '@/components/shared/file-field'
import { FormSection } from '@/components/shared/form-section'
import { TextAreaField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import type { CreateTicketCatalogs } from '../hooks/use-create-ticket-catalogs'
import {
  useCreateTicketForm,
  type CreateTicketFormState,
} from '../hooks/use-create-ticket-form'
import type { CreateTicketInput } from '../schemas'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'
import { ticketMessages } from '../i18n'
import { RequiredAttachmentField } from './required-attachment-field'
import { TicketCaptureFields } from './ticket-capture-fields'
import { TicketFormAside } from './ticket-form-aside'

interface TicketFormFieldsProps {
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
  catalogs: CreateTicketCatalogs
  canChooseRequester: boolean
  ownRequesterName: string | null
  fixedDependencyId?: string
  fixedDependencyName?: string | null
  placeDisabled: boolean
  needsRequester: boolean
  showOccurredAt: boolean
  photo: File | null
  onPhotoChange: (file: File | null) => void
  attachment: File | null
  onAttachmentChange: (file: File | null) => void
  requiredAttachmentTypes: string[]
  attachmentInstructions: string | null
  isUploadingAttachment: boolean
  attachmentProgress: number
  attachmentError?: string
}

type DescriptionFieldsProps = Pick<
  TicketFormFieldsProps,
  | 'register'
  | 'errors'
  | 'showOccurredAt'
  | 'photo'
  | 'onPhotoChange'
  | 'attachment'
  | 'onAttachmentChange'
  | 'requiredAttachmentTypes'
  | 'attachmentInstructions'
  | 'isUploadingAttachment'
  | 'attachmentProgress'
  | 'attachmentError'
>

function TicketDescriptionFields({
  register,
  errors,
  showOccurredAt,
  photo,
  onPhotoChange,
  attachment,
  onAttachmentChange,
  requiredAttachmentTypes,
  attachmentInstructions,
  isUploadingAttachment,
  attachmentProgress,
  attachmentError,
}: DescriptionFieldsProps) {
  const { sections, fields } = ticketMessages.create
  return (
    <FormSection
      title={sections.description}
      description={sections.descriptionHelp}
    >
      <TextAreaField
        id="description"
        label={fields.description}
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />
      {showOccurredAt ? (
        <TextField
          id="create-occurred-at"
          label="Hora real de registro"
          type="datetime-local"
          error={errors.occurredAt?.message}
          {...register('occurredAt')}
        />
      ) : null}
      <FileField
        id="create-photo"
        label={ticketMessages.create.photo}
        file={photo}
        onChange={onPhotoChange}
        accept="image/*"
        camera
      />
      <RequiredAttachmentField
        types={requiredAttachmentTypes}
        file={attachment}
        error={attachmentError}
        hint={attachmentInstructions}
        onChange={onAttachmentChange}
      />
      {isUploadingAttachment ? (
        <p className="text-sm text-muted-foreground" role="status">
          {ticketMessages.create.attachmentUploading} {attachmentProgress}%
        </p>
      ) : null}
    </FormSection>
  )
}

function TicketFormFields({
  register,
  errors,
  catalogs,
  canChooseRequester,
  ownRequesterName,
  fixedDependencyId,
  fixedDependencyName,
  placeDisabled,
  needsRequester,
  ...description
}: TicketFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <TicketCaptureFields
        register={register}
        errors={errors}
        catalogs={catalogs}
        canChooseRequester={canChooseRequester}
        ownRequesterName={ownRequesterName}
        fixedDependencyId={fixedDependencyId}
        fixedDependencyName={fixedDependencyName}
        placeDisabled={placeDisabled}
        needsRequester={needsRequester}
      />
      <TicketDescriptionFields
        register={register}
        errors={errors}
        {...description}
      />
    </div>
  )
}

function TicketFormActions({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <FormActionsBar>
      <Button type="button" variant="ghost" asChild className="min-h-11">
        <Link to="/tickets" search={{ page: 1 }}>
          {ticketMessages.create.cancel}
        </Link>
      </Button>
      <Button type="submit" disabled={isSubmitting} className="min-h-11">
        {isSubmitting
          ? ticketMessages.create.submitting
          : ticketMessages.create.submit}
      </Button>
    </FormActionsBar>
  )
}

function attachmentErrorOf(create: CreateTicketFormState): string | undefined {
  if (
    create.requiredAttachmentTypes.length > 0 &&
    !create.attachment &&
    create.submitError === ticketMessages.create.attachmentRequired
  ) {
    return create.submitError
  }
  return undefined
}

function TicketFormContent({ create }: { create: CreateTicketFormState }) {
  const { register, formState } = create.form
  return (
    <form onSubmit={create.onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TicketFormFields
          register={register}
          errors={formState.errors}
          catalogs={create.catalogs}
          canChooseRequester={create.canChooseRequester}
          showOccurredAt={create.showOccurredAt}
          ownRequesterName={create.ownRequester?.fullName ?? null}
          fixedDependencyId={create.fixedDependencyId}
          fixedDependencyName={create.fixedDependencyName}
          placeDisabled={create.placeDisabled}
          needsRequester={create.needsRequester}
          photo={create.photo}
          onPhotoChange={create.setPhoto}
          attachment={create.attachment}
          onAttachmentChange={create.setAttachment}
          requiredAttachmentTypes={create.requiredAttachmentTypes}
          attachmentInstructions={create.attachmentInstructions}
          isUploadingAttachment={create.isUploadingAttachment}
          attachmentProgress={create.attachmentProgress}
          attachmentError={attachmentErrorOf(create)}
        />
        <TicketFormAside
          submitError={create.submitError}
          createError={create.createError}
          candidates={create.candidates}
          isSubmitting={create.isSubmitting}
          onConfirm={create.confirmDuplicate}
          onCancel={create.cancelDuplicate}
        />
      </div>
      <TicketFormActions isSubmitting={create.isSubmitting} />
    </form>
  )
}

/** Formulario de alta de tiquet: secciones, aviso de duplicados y guardado fijo. */
export function TicketForm() {
  const create = useCreateTicketForm()
  useUnsavedChangesGuard(
    create.form.formState.isDirty && !create.allowLeave,
    ticketMessages.create.unsaved,
  )
  return <TicketFormContent create={create} />
}
