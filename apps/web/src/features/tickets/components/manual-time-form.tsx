import { ErrorAlert } from '@/components/shared/async-state'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { useTechnicians } from '@/features/catalogs'
import type { TechnicianOption } from '@/features/catalogs'
import { toTicketError } from '../domain/errors'
import { CLOCK_CLASSES, TIME_SPAN_KINDS } from '../domain/types'
import type { ClockClass, TimeSpanKind } from '../domain/types'
import {
  clockClassLabels,
  manualTimeMessages,
  ticketMessages,
  timeSpanKindLabels,
} from '../i18n'
import { useRecordManualTime } from '../hooks/use-manual-time'
import { manualTimeSchema } from '../schemas'

interface FormValues {
  kind: TimeSpanKind
  clockClass: ClockClass
  technicianId: string
  startedAt: string
  endedAt: string
}

const EMPTY: FormValues = {
  kind: 'active_work',
  clockClass: 'counted',
  technicianId: '',
  startedAt: '',
  endedAt: '',
}

const fields = manualTimeMessages.fields
const kindOptions = TIME_SPAN_KINDS.map((kind) => ({
  value: kind,
  label: timeSpanKindLabels[kind],
}))
const clockOptions = CLOCK_CLASSES.map((clock) => ({
  value: clock,
  label: clockClassLabels[clock],
}))

function toIso(localValue: string): string {
  return localValue ? new Date(localValue).toISOString() : ''
}

function ManualTimeFields({
  values,
  technicians,
  onChange,
}: {
  values: FormValues
  technicians: TechnicianOption[]
  onChange: (patch: Partial<FormValues>) => void
}) {
  return (
    <>
      <SelectField
        id="manual-time-kind"
        label={fields.kind}
        options={kindOptions}
        value={values.kind}
        onChange={(event) =>
          onChange({ kind: event.target.value as TimeSpanKind })
        }
      />
      <SelectField
        id="manual-time-technician"
        label={fields.technician}
        placeholder={fields.noTechnician}
        options={technicians.map((technician) => ({
          value: technician.id,
          label: technician.fullName,
        }))}
        value={values.technicianId}
        onChange={(event) => onChange({ technicianId: event.target.value })}
      />
      <TextField
        id="manual-time-start"
        label={fields.startedAt}
        type="datetime-local"
        value={values.startedAt}
        onChange={(event) => onChange({ startedAt: event.target.value })}
      />
      <TextField
        id="manual-time-end"
        label={fields.endedAt}
        type="datetime-local"
        value={values.endedAt}
        onChange={(event) => onChange({ endedAt: event.target.value })}
      />
      <SelectField
        id="manual-time-clock"
        label={fields.clockClass}
        options={clockOptions}
        value={values.clockClass}
        onChange={(event) =>
          onChange({ clockClass: event.target.value as ClockClass })
        }
      />
    </>
  )
}

function ManualTimeFooter({
  pending,
  message,
  onClose,
}: {
  pending: boolean
  message: string | null
  onClose: () => void
}) {
  return (
    <>
      {message ? <ErrorAlert message={message} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? manualTimeMessages.submitting : manualTimeMessages.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onClose}
        >
          {ticketMessages.actionFields.cancel}
        </Button>
      </div>
    </>
  )
}

/** Formulario para registrar un tramo de tiempo manual atribuido a un técnico. */
export function ManualTimeForm({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const technicians = useTechnicians()
  const record = useRecordManualTime(ticketId)
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const patch = (next: Partial<FormValues>) =>
    setValues((current) => ({ ...current, ...next }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = manualTimeSchema.safeParse({
      kind: values.kind,
      clockClass: values.clockClass,
      technicianId: values.technicianId || undefined,
      startedAt: toIso(values.startedAt),
      endedAt: toIso(values.endedAt),
    })
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? manualTimeMessages.errors.required,
      )
      return
    }
    setError(null)
    record.mutate(
      { input: parsed.data, clientRequestId: crypto.randomUUID() },
      { onSuccess: onClose },
    )
  }

  const message =
    error ?? (record.error ? toTicketError(record.error).message : null)

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <ManualTimeFields
        values={values}
        technicians={technicians.data ?? []}
        onChange={patch}
      />
      <ManualTimeFooter
        pending={record.isPending}
        message={message}
        onClose={onClose}
      />
    </form>
  )
}
