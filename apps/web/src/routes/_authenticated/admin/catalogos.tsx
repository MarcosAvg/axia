import { createFileRoute, Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { PageHeader } from '@/components/shared/page-header'
import {
  ADMIN_CATALOGS,
  CatalogManager,
  adminMessages,
  catalogByKey,
} from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/catalogos')({
  validateSearch: (search: Record<string, unknown>) => ({
    catalog: typeof search.catalog === 'string' ? search.catalog : 'teams',
  }),
  component: CatalogsPage,
})

function CatalogsPage() {
  const { catalog } = Route.useSearch()
  const config = catalogByKey(catalog)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={adminMessages.nav.catalogs}
        description={adminMessages.descriptions.catalogs}
      />
      <nav className="flex flex-wrap gap-1" aria-label="Catálogos">
        {ADMIN_CATALOGS.map((item) => (
          <Link
            key={item.key}
            to="/admin/catalogos"
            search={{ catalog: item.key }}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full px-3 text-sm',
              item.key === config.key
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      <CatalogManager config={config} />
    </div>
  )
}
