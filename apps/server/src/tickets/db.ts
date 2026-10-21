import type { Database } from '../db/client.js'

export type DbExecutor = Pick<Database, 'execute'>
