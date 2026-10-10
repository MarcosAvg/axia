import type { ReactNode } from 'react'

interface FormGroupProps {
  title: string
  description?: string
  children: ReactNode
}

/** Bloque de campos dentro de un diálogo (sin borde propio, para no anidar marcos). */
export function FormGroup({ title, description, children }: FormGroupProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
