import { expect, type Locator, type Page } from '@playwright/test'

/** Contraseña de las cuentas de la semilla demo (solo entorno local). */
const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

const REQUIRED_FIELD = [
  'Escribe tu usuario.',
  'Escribe tu contraseña.',
] as const
const ATTEMPTS = 3
/** Margen para comprobar que el formulario conservó lo escrito. */
const HOLD_TIMEOUT_MS = 500

/**
 * Envía las credenciales de acceso sin esperar el desenlace.
 *
 * El formulario de `/login` se monta con el arranque de la SPA. Escribiendo tecla
 * por tecla (`pressSequentially`) se midió que un acceso de cada ~100 perdía lo
 * escrito: el campo quedaba vacío y la validación del cliente respondía sin
 * llegar al servidor. `fill` escribe en un solo evento y el valor se verifica
 * antes de enviar; si el formulario vuelve a montarse, se reescribe.
 */
export async function submitLogin(
  page: Page,
  username: string,
  password = DEMO_PASSWORD,
) {
  await page.goto('/login')
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    await fillCredentials(page, username, password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    if (!(await lostCredentials(page))) return
  }
  throw new Error(`El acceso de ${username} perdió las credenciales al enviar`)
}

/** Inicia sesión con una cuenta demo y espera el menú de usuario. */
export async function signIn(
  page: Page,
  username: string,
  password = DEMO_PASSWORD,
) {
  await page.goto('/login')
  const signedIn = page.getByRole('button', { name: 'Menú de usuario' })
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    await fillCredentials(page, username, password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(signedIn.or(requiredField(page)).first()).toBeVisible()
    if (!(await requiredField(page).first().isVisible())) {
      await expect(signedIn).toBeVisible()
      return
    }
  }
  throw new Error(`El acceso de ${username} perdió las credenciales al enviar`)
}

/** Mensaje que solo aparece cuando la validación del cliente no recibió valores. */
function requiredField(page: Page) {
  return page.getByText(REQUIRED_FIELD[0]).or(page.getByText(REQUIRED_FIELD[1]))
}

async function fillCredentials(page: Page, username: string, password: string) {
  const user = page.getByLabel('Usuario')
  const secret = page.getByLabel('Contraseña')
  await expect(user).toBeVisible()
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    await user.fill(username)
    await secret.fill(password)
    if (
      (await holdsValue(user, username)) &&
      (await holdsValue(secret, password))
    )
      return
  }
  throw new Error('El formulario de acceso no conservó los valores escritos')
}

async function holdsValue(locator: Locator, value: string) {
  try {
    await expect(locator).toHaveValue(value, { timeout: HOLD_TIMEOUT_MS })
    return true
  } catch {
    return false
  }
}

async function lostCredentials(page: Page) {
  try {
    await requiredField(page)
      .first()
      .waitFor({ state: 'visible', timeout: HOLD_TIMEOUT_MS })
    return true
  } catch {
    return false
  }
}

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

/** Envía el alta y confirma el aviso de posible duplicado si aparece. */
export async function submitTicketForm(page: Page) {
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  const confirm = page.getByRole('button', {
    name: 'Registrar de todas formas',
  })
  const created = page.getByText('Registro', { exact: true })
  await expect(confirm.or(created).first()).toBeVisible()
  if (await confirm.isVisible()) await confirm.click()
  await expect(created).toBeVisible()
}
