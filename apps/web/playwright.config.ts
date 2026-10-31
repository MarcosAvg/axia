import { defineConfig, devices } from '@playwright/test'

const apiUrl = 'http://127.0.0.1:3101'

// Pruebas de extremo a extremo: pocas y bien elegidas (convenciones, §13).
// El flujo del técnico sin conexión llega en la Fase 5.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Una sola base/semilla: admin importa Equipos/Categorías mientras otros flujos
  // crean ofertas y asignan sobre esos mismos catálogos y cuentas. Hasta tener
  // fixtures por worker, serializar evita interferencia sin cambiar aserciones.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // Vite transforma los chunks diferidos de cada ruta en el primer acceso; en frío
  // eso puede superar los límites por defecto. Se amplían sin tocar las aserciones.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5174',
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
      command: 'pnpm dev --port 5174 --strictPort',
      env: { AXIA_API_URL: apiUrl, AXIA_ENV_FILE: '/dev/null' },
      url: 'http://localhost:5174',
      reuseExistingServer: false,
    },
  ],
})
