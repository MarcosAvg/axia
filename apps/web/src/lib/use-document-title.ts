import { useEffect } from 'react'

const APP_NAME = 'Axia'

/** Título de la pestaña para una pantalla concreta. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
