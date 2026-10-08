import { expect, test } from '@playwright/test'

test('muestra la pantalla de inicio con el nombre de la aplicación', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Axia' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Comenzar' })).toBeVisible()
})
