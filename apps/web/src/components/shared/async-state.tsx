import type { ReactNode } from 'react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

/** Marcador de carga para listas y tableros. */
export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  )
}

/** Aviso de error de carga, con una acción opcional para reintentar. */
export function ErrorAlert({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{message}</AlertTitle>
      {action ? <div className="mt-2">{action}</div> : null}
    </Alert>
  )
}
