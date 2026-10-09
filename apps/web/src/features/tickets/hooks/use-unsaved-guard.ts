import { useBlocker } from '@tanstack/react-router'
import { useCallback } from 'react'

/**
 * Avisa antes de salir con cambios sin guardar: bloquea la navegación interna
 * (con confirmación) y usa el aviso nativo al cerrar o recargar la pestaña.
 */
export function useUnsavedChangesGuard(enabled: boolean, message: string) {
  const shouldBlockFn = useCallback(() => !window.confirm(message), [message])

  useBlocker({
    shouldBlockFn,
    enableBeforeUnload: enabled,
    disabled: !enabled,
  })
}
