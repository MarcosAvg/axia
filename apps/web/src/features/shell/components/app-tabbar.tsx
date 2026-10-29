import { EllipsisIcon } from 'lucide-react'
import { cn } from 'cn'
import { useAuth } from '@/features/auth'
import { shellMessages } from '../i18n'
import { NavDestination } from './nav-destination'
import { mobileTabs } from './nav-items'

const tabClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-xs font-medium text-muted-foreground transition-colors aria-[current=page]:text-foreground aria-[current=page]:[&>svg]:text-primary [&>svg]:size-5'

interface AppTabbarProps {
  onOpenMore: () => void
}

/** Barra inferior de la aplicación: tres destinos por rol y acceso al resto. */
export function AppTabbar({ onOpenMore }: AppTabbarProps) {
  const { identity } = useAuth()
  const tabs = mobileTabs(identity)

  return (
    <nav
      aria-label={shellMessages.tabbar.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="flex items-stretch">
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <NavDestination key={item.id} item={item} className={tabClass}>
              <Icon aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </NavDestination>
          )
        })}
        <button
          type="button"
          onClick={onOpenMore}
          className={cn(tabClass, 'text-muted-foreground')}
        >
          <EllipsisIcon aria-hidden />
          <span>{shellMessages.tabbar.more}</span>
        </button>
      </div>
    </nav>
  )
}
