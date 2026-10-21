import type { Pool } from 'pg'

export async function checkDatabase(
  pool: Pool,
  timeoutMs = 2_000,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Database health check timed out'))
    }, timeoutMs)
    timer.unref()
  })

  try {
    const result = await Promise.race([pool.query('select 1'), timeout])
    if (result.rowCount !== 1) {
      throw new Error('Database health check returned an unexpected result')
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
