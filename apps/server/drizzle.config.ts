import { defineConfig } from 'drizzle-kit'

const url = process.env.MIGRATION_DATABASE_URL

if (!url && process.argv.includes('pull')) {
  throw new Error('MIGRATION_DATABASE_URL is required to pull the schema')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './db/migrations',
  dbCredentials: {
    url: url ?? 'postgres://localhost:5432/axia',
  },
  strict: true,
  verbose: true,
})
