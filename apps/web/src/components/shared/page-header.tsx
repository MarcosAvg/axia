import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/lib/use-document-title'

interface PageHeadingProps {
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
}

/** Encabezado visual para vistas que administran el título de la pestaña. */
export function PageHeading({
  title,
  description,
  actions,
  children,
}: PageHeadingProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1 lg:flex-1">
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground lg:line-clamp-none">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="grid w-full shrink-0 gap-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center">
          {actions}
        </div>
      ) : null}
    </header>
  )
}

/** Encabezado de página con título para la pestaña del navegador. */
export function PageHeader({
  documentTitle,
  ...props
}: PageHeadingProps & { documentTitle?: string }) {
  useDocumentTitle(documentTitle ?? props.title)
  return <PageHeading {...props} />
}
