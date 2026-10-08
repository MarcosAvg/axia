import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from 'cn'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const selectClass =
  'min-h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

function FieldShell({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      <FieldError errors={error ? [{ message: error }] : undefined} />
    </Field>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
}

/** Campo de texto con etiqueta y mensaje de error (accesible). */
export function TextField({
  id,
  label,
  error,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        className={cn('min-h-11', className)}
        {...inputProps}
      />
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

/** Selector nativo accesible (mejor en móvil). */
export function SelectField({
  id,
  label,
  error,
  options,
  placeholder,
  className,
  ...selectProps
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(selectClass, className)}
        {...selectProps}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
  error?: string
}

/** Área de texto con etiqueta y mensaje de error. */
export function TextAreaField({
  id,
  label,
  error,
  className,
  ...textareaProps
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <Textarea
        id={id}
        aria-invalid={Boolean(error)}
        className={cn('min-h-24', className)}
        {...textareaProps}
      />
    </FieldShell>
  )
}
