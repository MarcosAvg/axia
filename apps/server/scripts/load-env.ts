import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url))

export function loadRootEnv() {
  const envFile = process.env.AXIA_ENV_FILE ?? rootEnv
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile)
  }
}
