import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/lib/use-document-title'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Título de la pestaña cuando el encabezado visible no es adecuado (p. ej. un saludo). */
  documentTitle?: string
}

/** Encabezado de página: título, descripción y acciones. */
export function PageHeader({
  title,
  description,
  actions,
  documentTitle,
}: PageHeaderProps) {
  useDocumentTitle(documentTitle ?? title)

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground lg:line-clamp-none">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
