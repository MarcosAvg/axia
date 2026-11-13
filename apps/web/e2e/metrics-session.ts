import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

export async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Inicia sesión' }),
  ).toBeVisible()
  // Vite dev hidrata el formulario después del primer render; esperar evita
  // que el valor escrito se pierda al montar los manejadores de React.
  await page.waitForTimeout(400)
  const user = page.getByLabel('Usuario')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await user.fill(email)
    if ((await user.inputValue()) === email) break
  }
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
}

export async function openMetrics(page: Page) {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
}
