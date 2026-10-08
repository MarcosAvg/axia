export function downloadTextFile(
  filename: string,
  content: string,
  type = 'text/csv;charset=utf-8',
): void {
  downloadBlob(filename, new Blob([content], { type }))
}

/** Descarga un blob con el nombre indicado. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
