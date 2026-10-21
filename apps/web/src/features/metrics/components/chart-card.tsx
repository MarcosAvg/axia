import type { ReactNode } from 'react'
import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Tarjeta que contiene una gráfica o tabla con título y ayuda opcional. */
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
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          <HintLabel label={title} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
