import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('el selector aplica los temas Ámbar y Rosa', async ({ page }) => {
  await signIn(page, 'demo.admin')
  const toggle = page.getByRole('button', { name: 'Cambiar tema y modo' })

  await toggle.click()
  await page.getByRole('menuitemradio', { name: 'Ámbar' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'amber')

  await toggle.click()
  await page.getByRole('menuitemradio', { name: 'Rosa' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rose')
})

test('@smoke la barra de estado sigue el fondo del tema activo', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => {
    if (!localStorage.getItem('axia.theme')) {
      localStorage.setItem('axia.theme', 'amber')
      localStorage.setItem('axia.color-mode', 'system')
    }
  })
  await signIn(page, 'demo.admin')

  const expectMatchingColor = () =>
    expect
      .poll(() =>
        page.evaluate(`(() => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d')
          const pixel = (color) => {
            context.clearRect(0, 0, 1, 1)
            context.fillStyle = color
            context.fillRect(0, 0, 1, 1)
            return Array.from(context.getImageData(0, 0, 1, 1).data).join(',')
          }
          const meta = document.querySelector(
            'meta[name="theme-color"]',
          )
          return (
            pixel(meta.content) ===
            pixel(getComputedStyle(document.body).backgroundColor)
          )
        })()`),
      )
      .toBe(true)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'amber')
  await expectMatchingColor()
  await page.getByRole('button', { name: 'Cambiar tema y modo' }).click()
  await page.getByRole('menuitemradio', { name: 'Rosa' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rose')
  await expectMatchingColor()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await expectMatchingColor()
})
