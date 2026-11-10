import { useState } from 'react'
import { can, useAuth } from '@/features/auth'

/**
 * Hora real de una acción por proxy, disponible solo para quien puede ajustarla.
 * `enabled` indica que el contexto permite hora manual (sujeto seleccionado y
 * acción de técnico). El valor es una hora de pared de la instancia; el servidor
 * la convierte y valida.
 */
export function useActionTime(enabled = true) {
  const { identity } = useAuth()
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const show = enabled && can(identity, 'time.record_manual')
  return {
    value,
    setValue: (next: string) => {
      setTouched(true)
      setValue(next)
    },
    show,
    timezone: identity?.timezone ?? null,
    local: show && touched && value ? value : undefined,
  }
}
