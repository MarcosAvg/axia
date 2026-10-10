// Formateadores de presentación (es-MX). Sin dependencias externas.

// Zona horaria de la instancia para mostrar fechas; la fija el proveedor de autenticación.
let displayTimezone: string | undefined

/** Fija la zona horaria con la que se muestran las fechas (zona de la institución). */
export function setDisplayTimezone(timezone: string | undefined): void {
  displayTimezone = timezone
}

function dateTimeOptions(): Intl.DateTimeFormatOptions {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  }
  if (displayTimezone) options.timeZone = displayTimezone
  return options
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', dateTimeOptions()).format(
    new Date(iso),
  )
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Duración legible entre dos instantes ISO (por ejemplo, un tramo de tiempo). */
export function formatDuration(
  startIso: string,
  endIso: string | null,
): string {
  if (!endIso) return ''
  const minutes = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  )
  if (minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** Tiempo transcurrido desde un instante ISO, con días ("3 d 4 h"). */
export function formatElapsed(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000)
  if (minutes <= 0) return '0 min'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`
  if (hours > 0) return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
  return `${rest} min`
}
