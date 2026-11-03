// Comprueba los puertos del arranque local antes de iniciar contenedores o
// procesos hijos. Un puerto ocupado debe fallar aquí, con un mensaje claro,
// y no dejar una pila a medias (web arriba contra una API que no escucha).
import { createServer } from 'node:net'

export function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') resolve(false)
      else reject(error)
    })
    server.listen(port, host, () => {
      server.close(() => resolve(true))
    })
  })
}

export async function assertPortsFree(entries) {
  const busy = []
  for (const { name, port, host = '127.0.0.1' } of entries) {
    if (!(await isPortFree(port, host))) busy.push(`${name} (${host}:${port})`)
  }
  if (busy.length > 0) {
    throw new Error(
      `Puerto en uso: ${busy.join(', ')}. Detén el proceso anterior o define otro puerto (PORT/AXIA_DEV_WEB_PORT).`,
    )
  }
}
