import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('@smoke el tablero de Bandeja muestra columnas y abre un tiquete', async ({
  page,
}) => {
  await signIn(page, 'demo.supervisor')
  await page.goto('/inbox')
  await page.getByRole('link', { name: 'Ver tablero' }).click()

  await expect(page).toHaveURL(/\/inbox\/tablero/)
  await expect(page.getByRole('heading', { name: 'Registrado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'En proceso' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'En reclamación' }),
  ).toBeVisible()

  const card = page.getByRole('link', { name: /AX-/ }).first()
  await expect(card).toBeVisible()
  await card.click()

  await expect(page).toHaveURL(/\/tickets\//)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')
})

test('@smoke el tablero de Mi trabajo muestra las columnas de estado', async ({
  page,
}) => {
  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await page.getByRole('link', { name: 'Ver tablero' }).click()

  await expect(page).toHaveURL(/\/mi-trabajo\/tablero/)
  await expect(page.getByRole('heading', { name: 'Registrado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver lista' })).toHaveAttribute(
    'href',
    '/mi-trabajo',
  )
})

test('@smoke los tableros respetan los permisos de cada bandeja', async ({
  page,
}) => {
  await signIn(page, 'demo.requester')

  await page.goto('/inbox/tablero')
  await expect(page.getByText('Sin acceso')).toBeVisible()

  await page.goto('/mi-trabajo/tablero')
  await expect(page.getByText('Sin acceso')).toBeVisible()
})
