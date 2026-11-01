import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { selectDefaultClassification } from './fixtures.js'

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

async function fillCapture(page: Page, description: string) {
  await page.goto('/tickets/nuevo')
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Dependencia solicitante')
    .selectOption({ label: 'Sistemas' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await selectDefaultClassification(page)
  await page.getByLabel('Descripción del problema').fill(description)
}

async function submitCapture(page: Page, description: string) {
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  const confirm = page.getByRole('button', {
    name: 'Registrar de todas formas',
  })
  const detail = page.getByText('Registro', { exact: true })
  await expect(confirm.or(detail).first()).toBeVisible()
  if (await confirm.isVisible()) await confirm.click()
  await expect(page.getByText(description)).toBeVisible()
}

test('@smoke avisa, registra y permite marcar el duplicado', async ({
  page,
}) => {
  const description = `Fuga repetida E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.requester')

  await fillCapture(page, description)
  await submitCapture(page, description)

  await fillCapture(page, description)
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await expect(page.getByText('Posibles duplicados')).toBeVisible()
  await expect(page.getByText(/% de coincidencia/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Registrar de todas formas' }).click()

  await expect(
    page.getByText('Se registró a pesar del aviso.').first(),
  ).toBeVisible()
  await expect(
    page.getByText('Posible duplicado', { exact: true }).first(),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Marcar duplicado', exact: true })
    .click()
  await expect(page.getByText('Candidatos detectados')).toBeVisible()
  await page
    .getByRole('button', { name: 'Es duplicado de este' })
    .first()
    .click()
  await expect(page.getByText('Duplicado de', { exact: true })).toBeVisible()
})

test('@smoke descarta las alertas de un posible duplicado', async ({
  page,
}) => {
  const description = `Falla repetida E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.requester')

  await fillCapture(page, description)
  await submitCapture(page, description)

  await fillCapture(page, description)
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await page.getByRole('button', { name: 'Registrar de todas formas' }).click()
  await expect(
    page.getByText('Se registró a pesar del aviso.').first(),
  ).toBeVisible()

  await page.getByRole('button', { name: 'No es duplicado' }).click()
  await expect(page.getByText('Se descartaron las alertas.')).toBeVisible()
  await expect(page.getByText('Posibles duplicados')).toHaveCount(0)
})
