import type { ReactNode } from 'react'
import { ToneDot } from '@/components/shared/tone'
import { toneForId } from '@/lib/tones'

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
}

/** Bloque de formulario con título y descripción. */
export function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ToneDot tone={toneForId(title)} />
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
