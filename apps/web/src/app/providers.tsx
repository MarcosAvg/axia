import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { OfflineBootstrap } from '@/app/offline-bootstrap'
import { PwaUpdatePrompt } from '@/app/pwa-update-prompt'
import { queryClient } from '@/app/query-client'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { TimeAggregationProvider } from '@/components/shared/time-aggregation-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TimeAggregationProvider>
          <AuthProvider>
            <OfflineBootstrap />
            <TooltipProvider>
              {children}
              <PwaUpdatePrompt />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </TimeAggregationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
