import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { setupOffline } from '@/app/offline'
import { PwaUpdatePrompt } from '@/app/pwa-update-prompt'
import { queryClient } from '@/app/query-client'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth'

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => setupOffline(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <PwaUpdatePrompt />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
