import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminMessages } from '../i18n'
import { SupervisorScopes } from './supervisor-scopes'
import { TechnicianCategories } from './technician-categories'

/** Ámbitos de supervisor y designaciones de técnicos, en pestañas. */
export function ScopesManager() {
  const { scopes } = adminMessages
  return (
    <Tabs defaultValue="supervisor" className="flex min-w-0 flex-col gap-4">
      <TabsList className="h-auto w-full flex-wrap">
        <TabsTrigger value="supervisor" className="min-h-11">
          {scopes.supervisor}
        </TabsTrigger>
        <TabsTrigger value="technician" className="min-h-11">
          {scopes.technician}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="supervisor">
        <SupervisorScopes />
      </TabsContent>
      <TabsContent value="technician">
        <TechnicianCategories />
      </TabsContent>
    </Tabs>
  )
}
