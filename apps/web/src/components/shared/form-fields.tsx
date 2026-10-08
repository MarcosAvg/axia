import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from 'cn'

const controlClass =
  'min-h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30'

function FieldShell({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
}

/** Campo de texto con etiqueta y mensaje de error (accesible). */
export function TextField({ id, label, error, ...inputProps }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <Input id={id} aria-invalid={Boolean(error)} {...inputProps} />
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
        className={cn(controlClass, className)}
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
      <textarea
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(controlClass, 'min-h-24 py-2', className)}
        {...textareaProps}
      />
    </FieldShell>
  )
}
