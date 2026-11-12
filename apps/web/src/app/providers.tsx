import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type { ReactNode } from 'react'
import { OfflineBootstrap } from '@/app/offline-bootstrap'
import { queryPersister, shouldPersistQuery } from '@/app/query-persister'
import { PwaUpdatePrompt } from '@/app/pwa-update-prompt'
import { queryClient } from '@/app/query-client'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { TimeMeasureProvider } from '@/components/shared/time-measure-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth'
import {
  OFFLINE_CACHE_TTL_MS,
  QUERY_CACHE_BUSTER,
} from '@/lib/offline/cache-policy'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: OFFLINE_CACHE_TTL_MS,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersistQuery(query),
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      <ThemeProvider>
        <TimeMeasureProvider>
          <AuthProvider>
            <OfflineBootstrap />
            <TooltipProvider>
              {children}
              <PwaUpdatePrompt />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </TimeMeasureProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  )
}
