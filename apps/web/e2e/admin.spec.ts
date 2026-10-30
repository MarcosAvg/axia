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

test('el administrador crea un equipo desde la administración', async ({
  page,
}) => {
  const name = `Equipo E2E ${crypto.randomUUID().slice(0, 8)}`
  await signIn(page, 'demo.admin')

  await page.goto('/admin/catalogos')
  await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('Nombre').fill(name)
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('table').getByText(name)).toBeVisible()
})

test('@smoke exporta y reimporta los catálogos sin inválidas', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page.goto('/admin/catalogos')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar' }).click()
  const path = await (await downloadPromise).path()
  if (!path) throw new Error('La exportación no generó un archivo')

  await page.locator('input[type="file"]').setInputFiles(path)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Importar catálogos')).toBeVisible()
  await dialog.getByRole('button', { name: 'Importar', exact: true }).click()

  await expect(dialog.getByRole('status')).toContainText(
    /0 nuevas, \d+ actualizadas, 0 inválidas, 0 errores/,
    { timeout: 60_000 },
  )
  await expect(dialog.getByText('Sin incidencias.')).toBeVisible()
})
