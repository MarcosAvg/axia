import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url))
const serverEnv = fileURLToPath(new URL('../.env', import.meta.url))

for (const path of [rootEnv, serverEnv]) {
  if (existsSync(path)) {
    process.loadEnvFile(path)
  }
}
