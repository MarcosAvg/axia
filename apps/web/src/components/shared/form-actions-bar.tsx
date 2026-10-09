import type { ReactNode } from 'react'

/** Barra de acciones de formulario que permanece visible al desplazarse. */
export function FormActionsBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
      {children}
    </div>
  )
}
