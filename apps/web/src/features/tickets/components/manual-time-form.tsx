import { ErrorAlert } from '@/components/shared/async-state'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ButtonGrid } from '@/components/shared/button-grid'
import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { useTechnicians } from '@/features/catalogs'
import type { TechnicianOption } from '@/features/catalogs'
import { formatDateTime, formatDuration } from '@/lib/format'
import { toTicketError } from '../domain/errors'
import { suggestedTimeSpanKind } from '../domain/time'
import { CLOCK_CLASSES, TIME_SPAN_KINDS } from '../domain/types'
import type {
  ClockClass,
  ManualTimeContext,
  TimeSpanKind,
} from '../domain/types'
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

export type ManualTimeMode = 'correction' | 'missing'

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

function toLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function initialValues(
  mode: ManualTimeMode,
  context: ManualTimeContext,
): FormValues {
  const current = context.current
  if (mode === 'correction' && current) {
    return {
      kind: current.kind,
      clockClass: current.clockClass,
      technicianId:
        current.subjectTechnicianId ?? context.defaultTechnicianId ?? '',
      startedAt: toLocal(current.startedAt),
      endedAt: toLocal(current.endedAt),
    }
  }
  return {
    kind: suggestedTimeSpanKind(context.status),
    clockClass: 'counted',
    technicianId: context.defaultTechnicianId ?? '',
    startedAt: '',
    endedAt: '',
  }
}

function ManualTimeFields({
  values,
  technicians,
  correction,
  onChange,
}: {
  values: FormValues
  technicians: TechnicianOption[]
  correction: boolean
  onChange: (patch: Partial<FormValues>) => void
}) {
  return (
    <>
      <SelectField
        id="manual-time-kind"
        label={fields.kind}
        options={kindOptions}
        value={values.kind}
        disabled={correction}
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
        label={correction ? manualTimeMessages.endOptional : fields.endedAt}
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
      <ButtonGrid>
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
      </ButtonGrid>
    </>
  )
}

function parseManualTimeForm(
  mode: ManualTimeMode,
  values: FormValues,
  currentId: string | undefined,
) {
  if (mode === 'missing' && !values.endedAt) {
    return { error: manualTimeMessages.errors.endRequired }
  }
  const parsed = manualTimeSchema.safeParse({
    kind: values.kind,
    clockClass: values.clockClass,
    technicianId: values.technicianId || undefined,
    startedAt: toIso(values.startedAt),
    endedAt: values.endedAt ? toIso(values.endedAt) : undefined,
    replacesSpanId: currentId,
  })
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? manualTimeMessages.errors.required,
    }
  }
  return { input: parsed.data }
}

function useManualTimeForm(
  ticketId: string,
  mode: ManualTimeMode,
  context: ManualTimeContext,
  onClose: () => void,
) {
  const record = useRecordManualTime(ticketId)
  const technicians = useTechnicians()
  const [values, setValues] = useState<FormValues>(() =>
    initialValues(mode, context),
  )
  const [error, setError] = useState<string | null>(null)
  const correction = mode === 'correction' && Boolean(context.current)

  const patch = (next: Partial<FormValues>) =>
    setValues((current) => ({ ...current, ...next }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseManualTimeForm(
      mode,
      values,
      correction ? context.current?.id : undefined,
    )
    if ('error' in parsed) {
      setError(parsed.error ?? manualTimeMessages.errors.required)
      return
    }
    setError(null)
    record.mutate(
      { input: parsed.input, clientRequestId: crypto.randomUUID() },
      { onSuccess: onClose },
    )
  }

  return {
    values,
    patch,
    correction,
    error,
    record,
    technicians: technicians.data ?? [],
    submit,
    message:
      error ?? (record.error ? toTicketError(record.error).message : null),
  }
}

/** Formulario contextual: corrige el tramo actual o agrega uno faltante. */
export function ManualTimeForm({
  ticketId,
  mode,
  context,
  onClose,
}: {
  ticketId: string
  mode: ManualTimeMode
  context: ManualTimeContext
  onClose: () => void
}) {
  const form = useManualTimeForm(ticketId, mode, context, onClose)
  const duration =
    form.values.startedAt && form.values.endedAt
      ? formatDuration(toIso(form.values.startedAt), toIso(form.values.endedAt))
      : ''

  return (
    <form
      onSubmit={form.submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <p className="text-sm text-muted-foreground">
        {form.correction
          ? manualTimeMessages.correctionHint
          : manualTimeMessages.missingHint}
      </p>
      {form.correction && context.current ? (
        <p className="text-sm">
          <span className="text-muted-foreground">
            {manualTimeMessages.current}:{' '}
          </span>
          {timeSpanKindLabels[context.current.kind]} ·{' '}
          {formatDateTime(context.current.startedAt)}
        </p>
      ) : null}
      <ManualTimeFields
        values={form.values}
        technicians={form.technicians}
        correction={form.correction}
        onChange={form.patch}
      />
      {duration ? (
        <p className="text-sm text-muted-foreground">{duration}</p>
      ) : null}
      <ManualTimeFooter
        pending={form.record.isPending}
        message={form.message}
        onClose={onClose}
      />
    </form>
  )
}
