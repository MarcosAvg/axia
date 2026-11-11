import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { submitTicketForm } from './fixtures.js'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, user: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').pressSequentially(user, { delay: 5 })
  await page
    .getByLabel('Contraseña')
    .pressSequentially(DEMO_PASSWORD, { delay: 5 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('@smoke exige y descarga el adjunto del problema', async ({ page }) => {
  await signIn(page, 'demo.requester')
  await page.goto('/tickets/nuevo')

  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await page
    .getByLabel('Subcategoría', { exact: true })
    .selectOption({ label: 'Contacto' })
  await page
    .getByLabel('Problema', { exact: true })
    .selectOption({ label: 'Cotización requerida' })

  await expect(page.getByText('Adjunto obligatorio')).toBeVisible()
  await expect(page.getByText(/Formatos: PDF/)).toBeVisible()
  await page
    .getByLabel('Descripción del problema')
    .fill(`Adjunto obligatorio E2E ${crypto.randomUUID()}`)

  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await expect(
    page.getByText('Este problema exige adjuntar un archivo.').first(),
  ).toBeVisible()

  await page.setInputFiles('#required-attachment', {
    name: 'cotizacion.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),
  })
  await submitTicketForm(page)

  await expect(page.getByRole('heading', { name: 'Adjuntos' })).toBeVisible()
  await expect(page.getByText('cotizacion.pdf')).toBeVisible()
  const download = page.getByRole('link', { name: /Descargar/ })
  await expect(download).toHaveAttribute(
    'href',
    /\/api\/attachments\/[0-9a-f-]+\/file/,
  )
})
