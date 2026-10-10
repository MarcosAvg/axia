import type { ReactNode } from 'react'
import { ToneDot } from '@/components/shared/tone'
import { toneForId } from '@/lib/tones'

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
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ToneDot tone={toneForId(title)} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
