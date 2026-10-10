// Acentos de color: paleta fija multi-tono (ver `styles/accents.css`).

export type Tone =
  'tone-1' | 'tone-2' | 'tone-3' | 'tone-4' | 'tone-5' | 'tone-6'

export const TONES: Tone[] = [
  'tone-1',
  'tone-2',
  'tone-3',
  'tone-4',
  'tone-5',
  'tone-6',
]

export interface ToneClasses {
  /** Texto/ícono con el color del tono. */
  text: string
  /** Chip: tinte suave + texto de color. */
  chip: string
  /** Punto sólido. */
  dot: string
  /** Borde con el tono. */
  border: string
}

export const toneClasses: Record<Tone, ToneClasses> = {
  'tone-1': {
    text: 'text-tone-1',
    chip: 'bg-tone-1/10 text-tone-1',
    dot: 'bg-tone-1',
    border: 'border-tone-1/40',
  },
  'tone-2': {
    text: 'text-tone-2',
    chip: 'bg-tone-2/10 text-tone-2',
    dot: 'bg-tone-2',
    border: 'border-tone-2/40',
  },
  'tone-3': {
    text: 'text-tone-3',
    chip: 'bg-tone-3/10 text-tone-3',
    dot: 'bg-tone-3',
    border: 'border-tone-3/40',
  },
  'tone-4': {
    text: 'text-tone-4',
    chip: 'bg-tone-4/10 text-tone-4',
    dot: 'bg-tone-4',
    border: 'border-tone-4/40',
  },
  'tone-5': {
    text: 'text-tone-5',
    chip: 'bg-tone-5/10 text-tone-5',
    dot: 'bg-tone-5',
    border: 'border-tone-5/40',
  },
  'tone-6': {
    text: 'text-tone-6',
    chip: 'bg-tone-6/10 text-tone-6',
    dot: 'bg-tone-6',
    border: 'border-tone-6/40',
  },
}

/** Tono por índice (rota por la paleta, admite negativos y números grandes). */
export function toneForIndex(index: number): Tone {
  const size = TONES.length
  const safe = ((Math.trunc(index) % size) + size) % size
  return TONES[safe] as Tone
}

/** Tono estable a partir de un identificador o texto. */
export function toneForId(id: string): Tone {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return toneForIndex(hash)
}

/** Prioridad por nivel: 1=Urgente, 2=Alta, 3=Media, 4=Baja. */
const PRIORITY_TONES: Record<number, Tone> = {
  1: 'tone-5',
  2: 'tone-4',
  3: 'tone-1',
  4: 'tone-6',
}

export function toneForPriority(position: number | null | undefined): Tone {
  return PRIORITY_TONES[position ?? 3] ?? 'tone-1'
}
