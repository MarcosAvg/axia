import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const TICKET_ID = 'de000000-0000-4000-8000-000000000004'

async function signIn(page: Page, username = 'demo.admin') {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function openTicket(page: Page) {
  await page.goto(`/tickets/${TICKET_ID}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')
}

test('el detalle muestra estado, valida acciones y amplía evidencias', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page)
  await openTicket(page)

  await expect(page.getByText('En proceso', { exact: true })).toBeVisible()
  const headings = await page.locator('main h2').allInnerTexts()
  expect(headings.slice(0, 5)).toEqual([
    'Tiempo por fase',
    'Acciones',
    'Captura',
    'Línea de tiempo',
    'Evidencias',
  ])
  const width = (await page.evaluate(
    '({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })',
  )) as { scroll: number; client: number }
  expect(width.scroll).toBe(width.client)

  await page.getByRole('button', { name: 'Comentar' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Completa este campo.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByLabel('Archivo').setInputFiles({
    name: 'evidencia.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWM4w8BwhgGMzzAwAAAZjgMx8FJdJAAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await page.getByRole('button', { name: 'Subir evidencia' }).click()
  const thumbnail = page.getByRole('button', { name: /Ampliar evidencia/ })
  await expect(thumbnail.first()).toBeVisible({ timeout: 15_000 })
  await thumbnail.first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('img')).toHaveClass(/object-contain/)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('el técnico ve sus acciones antes que la gráfica de tiempos en móvil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')
  await openTicket(page)

  await expect(
    page.getByRole('heading', { name: 'Tiempo por fase' }),
  ).toBeHidden()
  const headings = await page.locator('main h2:visible').allInnerTexts()
  expect(headings[0]).toBe('Acciones')

  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(
    page.getByRole('heading', { name: 'Tiempo por fase' }),
  ).toBeVisible()
})
