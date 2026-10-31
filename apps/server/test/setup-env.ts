// Tests never discover developer or production environment files.
import { TEST_APP_PASSWORD, TEST_OWNER_URL } from '../scripts/test-target.js'

process.env.AXIA_ENV_FILE = '/dev/null'
process.env.MIGRATION_DATABASE_URL ??= TEST_OWNER_URL
process.env.AXIA_APP_PASSWORD ??= TEST_APP_PASSWORD
