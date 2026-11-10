import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { loadConfig } from '../src/config.js'
import { createDb } from '../src/db/client.js'
import {
  auditTime,
  type TimeAuditReport,
} from '../src/maintenance/time-audit.js'

function numberArg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = Number(process.argv[index + 1])
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} debe ser un entero mayor que cero`)
  }
  return value
}

function printHuman(report: TimeAuditReport) {
  process.stdout.write(`Auditoría de tiempos — ${report.generatedAt}\n`)
  for (const finding of report.findings) {
    const availability = finding.available
      ? ''
      : ' (no disponible en este esquema)'
    process.stdout.write(`\n${finding.key}: ${finding.count}${availability}\n`)
    for (const sample of finding.samples) {
      process.stdout.write(`  ${JSON.stringify(sample)}\n`)
    }
  }
  process.stdout.write(`\nTotal de hallazgos: ${report.totalFindings}\n`)
}

async function main() {
  const envFile =
    process.env.AXIA_ENV_FILE ?? new URL('../../../.env.dev', import.meta.url)
  if (existsSync(envFile)) process.loadEnvFile(envFile)

  const config = loadConfig()
  const { db, pool } = createDb(config.DATABASE_URL)
  try {
    const report = await auditTime(db, {
      limit: numberArg('limit', 10),
    })
    if (process.argv.includes('--json')) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    } else {
      printHuman(report)
    }
  } finally {
    await pool.end()
  }
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
