import { Link } from '@tanstack/react-router'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { FormActionsBar } from '@/components/shared/form-actions-bar'
import { FormSection } from '@/components/shared/form-section'
import { TextAreaField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { useCreateTicketForm } from '../hooks/use-create-ticket-form'
import type { CreateTicketCatalogs } from '../hooks/use-create-ticket-catalogs'
import type { CreateTicketInput } from '../schemas'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-guard'
import { ticketMessages } from '../i18n'
import { TicketCaptureFields } from './ticket-capture-fields'
import { TicketFormAside } from './ticket-form-aside'

interface TicketFormFieldsProps {
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
  catalogs: CreateTicketCatalogs
  canChooseRequester: boolean
  ownRequesterName: string | null
  photo: File | null
  onPhotoChange: (file: File | null) => void
}

function TicketFormFields({
  register,
  errors,
  catalogs,
  canChooseRequester,
  ownRequesterName,
  photo,
  onPhotoChange,
}: TicketFormFieldsProps) {
  const { sections, fields } = ticketMessages.create
  return (
    <div className="flex flex-col gap-4">
      <TicketCaptureFields
        register={register}
        errors={errors}
        catalogs={catalogs}
        canChooseRequester={canChooseRequester}
        ownRequesterName={ownRequesterName}
      />
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
        <div className="flex flex-col gap-2">
          <label htmlFor="create-photo" className="text-sm font-medium">
            {ticketMessages.create.photo}
          </label>
          <input
            id="create-photo"
            type="file"
            accept="image/*"
            className="min-h-11 text-sm"
            onChange={(event) => onPhotoChange(event.target.files?.[0] ?? null)}
          />
          {photo ? (
            <span className="text-xs text-muted-foreground">{photo.name}</span>
          ) : null}
        </div>
      </FormSection>
    </div>
  )
}

/** Formulario de alta de tiquet: secciones, aviso de duplicados y guardado fijo. */
export function TicketForm() {
  const {
    form,
    catalogs,
    canChooseRequester,
    ownRequester,
    candidates,
    onSubmit,
    confirmDuplicate,
    cancelDuplicate,
    submitError,
    createError,
    isSubmitting,
    allowLeave,
    photo,
    setPhoto,
  } = useCreateTicketForm()
  const { register, formState } = form

  useUnsavedChangesGuard(
    formState.isDirty && !allowLeave,
    ticketMessages.create.unsaved,
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TicketFormFields
          register={register}
          errors={formState.errors}
          catalogs={catalogs}
          canChooseRequester={canChooseRequester}
          ownRequesterName={ownRequester?.fullName ?? null}
          photo={photo}
          onPhotoChange={setPhoto}
        />
        <TicketFormAside
          submitError={submitError}
          createError={createError}
          candidates={candidates}
          isSubmitting={isSubmitting}
          onConfirm={confirmDuplicate}
          onCancel={cancelDuplicate}
        />
      </div>
      <FormActionsBar>
        <Button type="button" variant="ghost" asChild>
          <Link to="/tickets" search={{ page: 1 }}>
            {ticketMessages.create.cancel}
          </Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? ticketMessages.create.submitting
            : ticketMessages.create.submit}
        </Button>
      </FormActionsBar>
    </form>
  )
}
