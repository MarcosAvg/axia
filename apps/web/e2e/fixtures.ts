import type { Page } from '@playwright/test'

/** Completa subcategoría y problema después de elegir la categoría Eléctrico. */
export async function selectDefaultClassification(page: Page) {
  await page
    .getByLabel('Subcategoría', { exact: true })
    .selectOption({ label: 'Contacto' })
  await page
    .getByLabel('Problema', { exact: true })
    .selectOption({ label: 'Chispa o corto' })
}

/** PNG válido de 1×1 px para las evidencias de Playwright. */
export const testImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWM4w8BwhgGMzzAwAAAZjgMx8FJdJAAAAABJRU5ErkJggg==',
  'base64',
)
