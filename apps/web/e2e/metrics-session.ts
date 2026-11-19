import type { Page } from '@playwright/test'
import { signIn } from './fixtures.js'

export async function openMetrics(page: Page) {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
}
