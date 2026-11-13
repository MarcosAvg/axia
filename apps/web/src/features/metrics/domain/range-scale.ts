/**
 * Escala de tiempo compartida para las gráficas de distribución: redondea el
 * máximo a un paso legible y genera las marcas del eje.
 */

const STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 720, 1440, 2880, 4320, 5760,
  10080, 20160, 43200,
] as const

const MAX_INTERVALS = 4

export interface TimeScale {
  /** Extremo superior de la escala; siempre queda por encima del valor recibido. */
  max: number
  /** Separación entre marcas, en minutos. */
  step: number
  /** Marcas del eje, de 0 a `max`. */
  ticks: number[]
}

function genericStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw / MAX_INTERVALS))
  for (const factor of [1, 2, 5]) {
    const step = factor * magnitude
    if (raw / step <= MAX_INTERVALS) return step
  }
  return 10 * magnitude
}

/** Escala redondeada por encima de `maxValue`, con un máximo de cinco tramos. */
export function niceTimeScale(maxValue: number): TimeScale {
  const raw = Math.max(maxValue, 0)
  if (raw <= 0) return { max: 1, step: 1, ticks: [0, 1] }
  const step =
    STEPS.find((candidate) => raw / candidate <= MAX_INTERVALS) ??
    genericStep(raw)
  const max = (Math.floor(raw / step) + 1) * step
  const intervals = Math.round(max / step)
  return {
    max,
    step,
    ticks: Array.from({ length: intervals + 1 }, (_, index) => index * step),
  }
}
