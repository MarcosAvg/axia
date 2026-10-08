import type { InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
}

/** Campo de texto con etiqueta y mensaje de error (accesible). */
export function TextField({ id, label, error, ...inputProps }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={Boolean(error)} {...inputProps} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
