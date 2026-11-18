import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminMessages } from '../i18n'
import { AccountsPanel } from './accounts-panel'
import { UserLinks } from './user-links'

/** Usuarios: cuentas (roles y estado) y vínculos con los catálogos, en pestañas. */
export function UsersManager() {
  const { users } = adminMessages
  return (
    <Tabs defaultValue="accounts" className="flex min-w-0 flex-col gap-6">
      <TabsList className="grid h-auto w-full grid-cols-2 lg:flex lg:w-fit">
        <TabsTrigger value="accounts" className="min-h-11">
          {users.accountsTab}
        </TabsTrigger>
        <TabsTrigger value="links" className="min-h-11">
          {users.linksTab}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="accounts">
        <AccountsPanel />
      </TabsContent>
      <TabsContent value="links">
        <UserLinks />
      </TabsContent>
    </Tabs>
  )
}
