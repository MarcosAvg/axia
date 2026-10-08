import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PwaUpdatePrompt } from '@/app/pwa-update-prompt'
import { queryClient } from '@/app/query-client'
import { AuthProvider } from '@/features/auth'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <PwaUpdatePrompt />
      </AuthProvider>
    </QueryClientProvider>
  )
}
