import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from 'cn'
import { BENTO_GAP, BENTO_ROW_HEIGHT, rowSpanForHeight } from '../domain/bento'

export interface BentoItem {
  key: string
  className?: string
  rowGroup?: string
  content: ReactNode
}

function sameSpans(
  previous: Record<string, number>,
  next: Record<string, number>,
) {
  const keys = Object.keys(next)
  return (
    keys.length === Object.keys(previous).length &&
    keys.every((key) => previous[key] === next[key])
  )
}

function groupMaxima(tiles: HTMLElement[], spans: Record<string, number>) {
  const groups = new Map<string, number>()
  for (const tile of tiles) {
    const group = tile.dataset.rowGroup
    if (!group) continue
    const key = tile.dataset.bentoKey ?? ''
    const span = spans[key] ?? 1
    groups.set(group, Math.max(groups.get(group) ?? 1, span))
  }
  return groups
}

/** Iguala el alto de las tarjetas que comparten fila. */
function alignSpans(tiles: HTMLElement[], spans: Record<string, number>) {
  const groups = groupMaxima(tiles, spans)
  for (const tile of tiles) {
    const group = tile.dataset.rowGroup
    if (!group) continue
    const key = tile.dataset.bentoKey ?? ''
    spans[key] = groups.get(group) ?? 1
  }
}

/** Cuadrícula tipo bento: mide cada tarjeta y rellena los huecos. */
export function BentoGrid({ items }: { items: BentoItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [spans, setSpans] = useState<Record<string, number>>({})

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const tiles = Array.from(container.children) as HTMLElement[]
    const measure = () => {
      const next: Record<string, number> = {}
      for (const tile of tiles) {
        const content = tile.firstElementChild as HTMLElement | null
        next[tile.dataset.bentoKey ?? ''] = rowSpanForHeight(
          content?.getBoundingClientRect().height ?? 0,
        )
      }
      const columns =
        window.innerWidth >= 1280 ? 12 : window.innerWidth >= 768 ? 6 : 1
      if (columns > 1) alignSpans(tiles, next)
      setSpans((previous) => (sameSpans(previous, next) ? previous : next))
    }
    const observer = new ResizeObserver(measure)
    for (const tile of tiles) {
      observer.observe(tile)
      const content = tile.firstElementChild
      if (content) observer.observe(content)
    }
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [items.length])

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12"
      style={{
        gridAutoRows: `${BENTO_ROW_HEIGHT}px`,
        gridAutoFlow: 'dense',
        gap: `${BENTO_GAP}px`,
      }}
    >
      {items.map((item) => (
        <div
          key={item.key}
          data-bento-key={item.key}
          data-row-group={item.rowGroup}
          className={cn('min-w-0', item.className)}
          style={{
            gridRowEnd: spans[item.key] ? `span ${spans[item.key]}` : undefined,
          }}
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
