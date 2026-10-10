import type { ReactNode } from 'react'
import { PageHeader } from '@/components/shared/page-header'

interface AdminPageProps {
  title: string
  description?: string
  children: ReactNode
}

/** Marco uniforme de una pantalla de administración. */
export function AdminPage({ title, description, children }: AdminPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      {children}
    </div>
  )
}
