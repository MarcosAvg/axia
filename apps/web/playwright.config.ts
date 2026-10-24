import { defineConfig, devices } from '@playwright/test'

const apiUrl = process.env.AXIA_API_URL ?? 'http://127.0.0.1:3100'

// Pruebas de extremo a extremo: pocas y bien elegidas (convenciones, §13).
// El flujo del técnico sin conexión llega en la Fase 5.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Los flujos comparten un servidor y una base PostgreSQL. Dos workers
  // mantienen estables los flujos pesados (offline, pausas) en local y en CI.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // Vite transforma los chunks diferidos de cada ruta en el primer acceso; en frío
  // eso puede superar los límites por defecto. Se amplían sin tocar las aserciones.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bash ../../scripts/e2e-server.sh',
      url: `${apiUrl}/api/health/live`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
