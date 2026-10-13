import { Children } from 'react'
import type { ReactNode } from 'react'
import { ButtonGrid } from './button-grid'

/**
 * Barra de acciones de formulario que permanece visible al desplazarse.
 * En móvil usa una rejilla (dos columnas con varios botones, una con uno solo);
 * en `sm+` se alinea a la derecha.
 */
export function FormActionsBar({ children }: { children: ReactNode }) {
  const columns = Children.count(children) > 1 ? 2 : 1
  return (
    <ButtonGrid
      columns={columns}
      className="sticky bottom-4 z-20 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur sm:justify-end"
    >
      {children}
    </ButtonGrid>
  )
}
