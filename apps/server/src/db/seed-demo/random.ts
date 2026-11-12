export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let result = Math.imul(value ^ (value >>> 15), 1 | value)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export function between(rnd: Rng, min: number, max: number) {
  return min + rnd() * (max - min)
}

export function integer(rnd: Rng, min: number, max: number) {
  return Math.floor(between(rnd, min, max + 1))
}

export function weighted<T>(rnd: Rng, entries: Array<[T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let value = rnd() * total
  for (const [entry, weight] of entries) {
    value -= weight
    if (value <= 0) return entry
  }
  return entries[entries.length - 1]?.[0] as T
}

export function shuffle<T>(rnd: Rng, values: T[]): T[] {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = integer(rnd, 0, index)
    const current = copy[index] as T
    copy[index] = copy[swap] as T
    copy[swap] = current
  }
  return copy
}
