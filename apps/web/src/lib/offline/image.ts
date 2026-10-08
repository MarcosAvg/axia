// Compresión de imágenes en el dispositivo antes de guardarlas en la cola.
// Se usa `canvas` para no añadir dependencias.

const MAX_DIMENSION = 1600
const QUALITY = 0.8

/** Comprime una imagen a JPEG reduciendo su lado mayor; deja otros archivos igual. */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', QUALITY)
    })
  } catch {
    // Si la imagen no se puede decodificar, se sube tal cual.
    return file
  }
}
