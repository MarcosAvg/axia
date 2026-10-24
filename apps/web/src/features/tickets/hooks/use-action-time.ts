import { useState } from 'react'
import { can, useAuth } from '@/features/auth'

function localNow(): string {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

/**
 * Hora real de una acción por proxy, disponible solo para quien puede ajustarla.
 * `enabled` indica que el contexto permite hora manual (sujeto seleccionado y
 * acción de técnico).
 */
export function useActionTime(enabled = true) {
  const { identity } = useAuth()
  const [value, setValue] = useState(localNow)
  const [touched, setTouched] = useState(false)
  const show = enabled && can(identity, 'time.record_manual')
  return {
    value,
    setValue: (next: string) => {
      setTouched(true)
      setValue(next)
    },
    show,
    iso: show && touched && value ? new Date(value).toISOString() : undefined,
  }
}
