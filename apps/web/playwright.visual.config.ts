import { defineConfig, devices } from '@playwright/test'

// Regresión visual: opt-in, fuera de la compuerta (`pnpm test:visual`).
// Las capturas viven en visual/__screenshots__ y se actualizan con
// `pnpm test:visual --update-snapshots`. Se enmascaran las zonas volátiles
// (gráficas y datos que dependen de la fecha).
export default defineConfig({
  testDir: './visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
