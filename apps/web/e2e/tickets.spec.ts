import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('@smoke un solicitante registra un tiquet y lo ve en la lista y el detalle', async ({
  page,
}) => {
  const description = `Prueba E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.requester')

  await page.goto('/tickets/nuevo')
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Dependencia solicitante')
    .selectOption({ label: 'Sistemas' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await page.getByLabel('Descripción del problema').fill(description)

  await page.getByRole('button', { name: 'Registrar tiquet' }).click()

  // Detalle recién creado.
  await expect(page.getByText(description)).toBeVisible()
  await expect(page.getByText('Registro', { exact: true })).toBeVisible()

  // Aparece en la lista.
  await page.getByRole('link', { name: 'Volver a la lista' }).click()
  await expect(page.getByText(description)).toBeVisible()
})
