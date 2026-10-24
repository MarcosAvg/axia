import { runDemoSeedCli } from '../src/db/seed-demo/cli.js'
import { loadRootEnv } from './load-env.js'

loadRootEnv()

runDemoSeedCli(process.argv.slice(2), process.env).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
