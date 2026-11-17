import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ProblemSearchOption } from '@/features/catalogs'
import { searchProblems } from '../domain/problem-search'

/** Estado y navegación de las sugerencias, sin modificar el formulario al escribir. */
export function useProblemSearch(
  problems: ProblemSearchOption[],
  onSelect: (problem: ProblemSearchOption) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const results = searchProblems(problems, query)

  function select(problem: ProblemSearchOption) {
    onSelect(problem)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function moveFocus(event: KeyboardEvent, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      inputRef.current?.focus()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    if (next < 0) {
      inputRef.current?.focus()
      return
    }
    const button =
      listRef.current?.querySelectorAll('button')[
        Math.min(next, results.length - 1)
      ]
    button?.focus()
  }

  return {
    inputRef,
    listRef,
    query,
    isOpen,
    results,
    select,
    moveFocus,
    changeQuery: (value: string) => {
      setQuery(value)
      setIsOpen(true)
    },
  }
}
