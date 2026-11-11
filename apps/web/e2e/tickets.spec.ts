import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { selectDefaultClassification, submitTicketForm } from './fixtures.js'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').pressSequentially(email, { delay: 5 })
  await page
    .getByLabel('Contraseña')
    .pressSequentially(DEMO_PASSWORD, { delay: 5 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('@smoke limita edificios y ubicaciones a la dependencia del solicitante', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const dependencyName = `Dependencia alcance ${suffix}`
  const requesterName = `Solicitante alcance ${suffix}`

  await signIn(page, 'demo.admin')

  await page.goto('/admin/catalogos?catalog=dependencies')
  await page.getByRole('button', { name: 'Agregar' }).click()
  const dependencyDialog = page.getByRole('dialog')
  await dependencyDialog.getByLabel('Nombre').fill(dependencyName)
  const central = dependencyDialog.locator('section', {
    has: page.getByRole('heading', { name: 'Edificio Central' }),
  })
  await central.getByRole('checkbox', { name: 'Planta baja' }).check()
  await dependencyDialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('table').getByText(dependencyName)).toBeVisible()

  await page.goto('/admin/catalogos?catalog=requesters')
  await page.getByRole('button', { name: 'Agregar' }).click()
  const requesterDialog = page.getByRole('dialog')
  await requesterDialog.getByLabel('Nombre completo').fill(requesterName)
  await requesterDialog
    .getByLabel('Dependencia')
    .selectOption({ label: dependencyName })
  await requesterDialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('table').getByText(requesterName)).toBeVisible()

  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: requesterName })
  await expect(page.getByText(dependencyName).first()).toBeVisible()
  const building = page.getByLabel('Edificio')
  await expect(building.locator('option')).toHaveText([
    'Selecciona…',
    'Edificio Central',
  ])
  await building.selectOption({ label: 'Edificio Central' })
  await expect(page.getByLabel('Ubicación').locator('option')).toHaveText([
    'Selecciona…',
    'Planta baja',
  ])

  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez' })
  await expect(building).toHaveValue('')
  await expect(page.getByLabel('Ubicación')).toHaveValue('')
})

test('la lista muestra datos relevantes y filtra desde Más filtros', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page.goto('/tickets')

  await expect(
    page.getByRole('columnheader', { name: 'Ubicación' }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'Solicitante' }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'Técnico' }),
  ).toBeVisible()

  await page.getByRole('button', { name: /Más filtros/ }).click()
  await page.getByLabel('Equipo').selectOption({ label: 'Mantenimiento' })
  await page.getByRole('button', { name: 'Aplicar' }).click()

  await expect(page).toHaveURL(/teamId=/)
  await expect(page.getByRole('dialog', { name: 'Más filtros' })).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Limpiar filtros' }),
  ).toBeVisible()
})

test('@smoke un solicitante registra un tiquet y lo ve en la lista y el detalle', async ({
  page,
}) => {
  const description = `Prueba E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.requester')

  await page.goto('/tickets/nuevo')
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await expect(page.getByLabel('Dependencia solicitante')).toHaveCount(0)
  await expect(page.getByText('Sistemas').first()).toBeVisible()
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await selectDefaultClassification(page)
  await page.getByLabel('Descripción del problema').fill(description)

  await submitTicketForm(page)

  // Detalle recién creado.
  await expect(page.getByText(description)).toBeVisible()
  await expect(page.getByText('Registro', { exact: true })).toBeVisible()

  // Aparece en la lista.
  await page.getByRole('link', { name: 'Volver a la lista' }).click()
  await expect(page.getByText(description)).toBeVisible()
})
