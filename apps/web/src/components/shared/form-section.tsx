import type { ReactNode } from 'react'
import { HintLabel } from '@/components/shared/hint'

interface FormSectionProps {
  title: string
  description?: string
  hint?: string
  children: ReactNode
}

/** Bloque de formulario con título y descripción. */
export function FormSection({
  title,
  description,
  hint,
  children,
}: FormSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <HintLabel label={title} hint={hint} />
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
