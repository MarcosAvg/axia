import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('un solicitante registra un tiquet y lo ve en la lista y el detalle', async ({
  page,
}) => {
  const description = `Prueba E2E ${crypto.randomUUID()}`
  await signIn(page, 'solicitante@axia.test')

  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Edificio')
    .selectOption({ label: 'Edificio Central (ejemplo)' })
  await page
    .getByLabel('Ubicación')
    .selectOption({ label: 'Planta baja (ejemplo)' })
  await page
    .getByLabel('Dependencia solicitante')
    .selectOption({ label: 'Sistemas (ejemplo)' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico (ejemplo)' })
  await page
    .getByLabel('Tipo de servicio')
    .selectOption({ label: 'Correctivo (ejemplo)' })
  await page.getByLabel('Prioridad').selectOption({ label: 'Media (ejemplo)' })
  await page.getByLabel('Canal').selectOption({ label: 'Web (ejemplo)' })
  await page.getByLabel('Descripción del problema').fill(description)

  await page.getByRole('button', { name: 'Registrar tiquet' }).click()

  // Detalle recién creado.
  await expect(page.getByText(description)).toBeVisible()
  await expect(page.getByText('Registro', { exact: true })).toBeVisible()

  // Aparece en la lista.
  await page.getByRole('link', { name: 'Volver a la lista' }).click()
  await expect(page.getByText(description)).toBeVisible()
})
