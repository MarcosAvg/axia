import { defineConfig, devices } from '@playwright/test'

// Pruebas de extremo a extremo: pocas y bien elegidas (convenciones, §13).
// El flujo del técnico sin conexión llega en la Fase 5.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Los flujos comparten un solo servidor de dev y una sola instancia de Supabase;
  // con más workers, las pruebas pesadas (offline, pausas) agotan su timeout por
  // contención. Dos es el máximo estable verificado en local.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
