import type { ReactNode } from 'react'

interface BandejaSectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

/** Sección de bandeja con título y acción opcional (por ejemplo, "Ver todos"). */
export function BandejaSection({
  title,
  action,
  children,
}: BandejaSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
