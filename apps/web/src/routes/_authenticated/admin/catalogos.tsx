import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { fieldSelectClass } from '@/components/shared/form-fields'
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

function CatalogPicker({ current }: { current: string }) {
  const navigate = useNavigate()
  return (
    <label className="flex flex-col gap-1 lg:hidden">
      <span className="text-sm font-medium">{adminMessages.catalogPicker}</span>
      <select
        className={fieldSelectClass}
        value={current}
        onChange={(event) => {
          void navigate({
            to: '/admin/catalogos',
            search: { catalog: event.target.value },
          })
        }}
      >
        {ADMIN_CATALOGS.map((item) => (
          <option key={item.key} value={item.key}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  )
}

function CatalogsPage() {
  const { catalog } = Route.useSearch()
  const config = catalogByKey(catalog)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={adminMessages.nav.catalogs}
        description={adminMessages.descriptions.catalogs}
      />
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <CatalogPicker current={config.key} />
        <nav aria-label="Catálogos" className="hidden flex-col gap-1 lg:flex">
          {ADMIN_CATALOGS.map((item) => {
            const active = item.key === config.key
            return (
              <Link
                key={item.key}
                to="/admin/catalogos"
                search={{ catalog: item.key }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm transition-colors',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>
        <CatalogManager config={config} />
      </div>
    </div>
  )
}
