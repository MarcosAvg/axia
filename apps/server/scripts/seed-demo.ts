import { runDemoSeedCli } from '../src/db/seed-demo/cli.js'

runDemoSeedCli(process.argv.slice(2), process.env).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
