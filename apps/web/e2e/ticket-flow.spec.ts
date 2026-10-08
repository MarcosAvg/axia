import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Cerrar sesión' }),
  ).toBeVisible()
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

async function uploadEvidence(page: Page, type: string) {
  await page.getByLabel('Tipo de evidencia').selectOption({ label: type })
  await page.getByLabel('Archivo').setInputFiles({
    name: 'evidencia.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('foto'),
  })
  await page.getByRole('button', { name: 'Subir evidencia' }).click()
}

test('el técnico recibe, atiende con evidencias y cierra su parte', async ({
  page,
}) => {
  const description = `Flujo técnico E2E ${crypto.randomUUID()}`

  // El administrador registra y asigna el tiquet al técnico.
  await signIn(page, 'admin@axia.test')
  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez (ejemplo)' })
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
  await expect(page.getByText(description)).toBeVisible()

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico')
    .selectOption({ label: 'Luis Gómez (ejemplo)' })
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Asignado', { exact: true })).toBeVisible()
  await signOut(page)

  // El técnico ve el tiquet en su bandeja, sube evidencia e inicia.
  await signIn(page, 'tecnico@axia.test')
  await page.goto('/mi-trabajo')
  await page.getByText(description).click()
  await uploadEvidence(page, 'Antes')
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await expect(page.getByText('En proceso', { exact: true })).toBeVisible()

  // Sube la evidencia de cierre y marca atendido.
  await uploadEvidence(page, 'Después')
  await page.getByRole('button', { name: 'Marcar atendido' }).click()
  await page
    .getByLabel('Descripción del trabajo')
    .fill('Se revisó la instalación y quedó funcionando')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(
    page.getByText('Atendido', { exact: true }).first(),
  ).toBeVisible()
})
