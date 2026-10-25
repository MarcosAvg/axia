// Usuario dueño de la cola y de las fotos guardadas en este dispositivo.
// Vive en localStorage para que esté disponible antes de cargar Dexie.

const KEY = 'axia.offline.userId'

export function currentOfflineUserId(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setOfflineUserId(userId: string | null): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (userId) localStorage.setItem(KEY, userId)
    else localStorage.removeItem(KEY)
  } catch {
    // Almacenamiento bloqueado (modo privado): la cola no se reenvía.
  }
}
