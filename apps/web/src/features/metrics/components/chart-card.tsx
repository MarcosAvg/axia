import type { ReactNode } from 'react'
import { HintLabel } from '@/components/shared/hint'

/** Bloque de contenido con título y ayuda; superficie plana, sin tarjeta. */
export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section data-slot="card" className="rounded-xl border bg-card p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-base font-medium tracking-tight text-foreground">
          <HintLabel label={title} hint={hint} />
        </h2>
      </header>
      {children}
    </section>
  )
}
