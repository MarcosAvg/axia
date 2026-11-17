function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function distanceAt(matrix: number[][], i: number, j: number): number {
  return matrix[i]?.[j] ?? Infinity
}

function canTranspose(
  left: string,
  right: string,
  i: number,
  j: number,
): boolean {
  return (
    i > 1 &&
    j > 1 &&
    left[i - 1] === right[j - 2] &&
    left[i - 2] === right[j - 1]
  )
}

function editDistance(left: string, right: string): number {
  const matrix: number[][] = [
    Array.from({ length: right.length + 1 }, (_, j) => j),
  ]
  for (let i = 1; i <= left.length; i++) {
    const row = [i]
    matrix.push(row)
    for (let j = 1; j <= right.length; j++) {
      const distance = Math.min(
        distanceAt(matrix, i - 1, j) + 1,
        distanceAt(matrix, i, j - 1) + 1,
        distanceAt(matrix, i - 1, j - 1) + Number(left[i - 1] !== right[j - 1]),
      )
      row[j] = canTranspose(left, right, i, j)
        ? Math.min(distance, distanceAt(matrix, i - 2, j - 2) + 1)
        : distance
    }
  }
  return distanceAt(matrix, left.length, right.length)
}

function wordScore(word: string, candidate: string): number {
  if (candidate.includes(word)) return 0
  const tolerance = word.length >= 8 ? 2 : Number(word.length >= 4)
  if (!tolerance || Math.abs(word.length - candidate.length) > tolerance)
    return Infinity
  // ponytail: comparar palabras de hasta 64 letras; usar índice de búsqueda si el catálogo crece.
  if (word.length > 64 || candidate.length > 64) return Infinity
  const distance = editDistance(word, candidate)
  return distance <= tolerance ? distance : Infinity
}

function matchScore(name: string, query: string): number {
  if (name === query) return 0
  if (name.includes(query)) return 1
  const candidates = name.split(' ')
  return (
    2 +
    query
      .split(' ')
      .reduce(
        (score, word) =>
          score +
          Math.min(
            ...candidates.map((candidate) => wordScore(word, candidate)),
          ),
        0,
      )
  )
}

/** Ordena hasta diez coincidencias parciales o aproximadas sin modificar el catálogo. */
export function searchProblems<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  const normalized = normalize(query)
  if (!normalized) return []
  return items
    .map((item) => ({
      item,
      score: matchScore(normalize(item.name), normalized),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score)
    .slice(0, 10)
    .map(({ item }) => item)
}
