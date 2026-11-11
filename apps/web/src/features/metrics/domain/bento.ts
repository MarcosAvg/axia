export const BENTO_ROW_HEIGHT = 8
export const BENTO_GAP = 16

/**
 * Filas que debe ocupar una tarjeta para que su contenido quepa.
 * Cada fila suma su alto más el espacio entre filas.
 */
export function rowSpanForHeight(
  height: number,
  rowHeight = BENTO_ROW_HEIGHT,
  gap = BENTO_GAP,
): number {
  if (!Number.isFinite(height) || height <= 0) return 1
  return Math.max(1, Math.ceil((height + gap) / (rowHeight + gap)))
}
