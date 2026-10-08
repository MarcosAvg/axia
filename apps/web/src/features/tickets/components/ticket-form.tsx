import { useCreateTicketForm } from '../hooks/use-create-ticket-form'
import { TicketCaptureFields } from './ticket-capture-fields'
import { TicketFormActions } from './ticket-form-actions'

/** Formulario de alta de tiquet. */
export function TicketForm() {
  const {
    form: {
      register,
      formState: { errors },
    },
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
  } = useCreateTicketForm()

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <TicketCaptureFields
        register={register}
        errors={errors}
        catalogs={catalogs}
        canChooseRequester={canChooseRequester}
        ownRequesterName={ownRequester?.fullName ?? null}
      />
      <TicketFormActions
        candidates={candidates}
        submitError={submitError}
        createError={createError}
        isSubmitting={isSubmitting}
        onConfirm={confirmDuplicate}
        onCancel={cancelDuplicate}
      />
    </form>
  )
}
