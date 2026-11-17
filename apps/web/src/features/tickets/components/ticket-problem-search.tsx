import { useId } from 'react'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import type { ProblemSearchOption } from '@/features/catalogs'
import { useProblemSearch } from '../hooks/use-problem-search'
import { ticketMessages } from '../i18n'

interface TicketProblemSearchProps {
  problems: ProblemSearchOption[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onSelect: (problem: ProblemSearchOption) => void
}

type SearchState = ReturnType<typeof useProblemSearch>

function ProblemSearchResults({
  listRef,
  results,
  select,
  moveFocus,
}: Pick<SearchState, 'listRef' | 'results' | 'select' | 'moveFocus'>) {
  return (
    <ul
      ref={listRef}
      aria-label={ticketMessages.create.problemSearch.resultsLabel}
      className="max-h-64 divide-y overflow-y-auto rounded-lg border"
    >
      {results.map((problem, index) => (
        <li key={problem.id}>
          <button
            type="button"
            className="min-h-11 w-full px-3 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
            onClick={() => select(problem)}
            onKeyDown={(event) => moveFocus(event, index)}
          >
            <span className="block text-sm font-medium">{problem.name}</span>{' '}
            <span className="block text-xs text-muted-foreground">
              {problem.categoryName} → {problem.subcategoryName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ProblemSearchStatus({
  isLoading,
  isError,
  count,
}: {
  isLoading: boolean
  isError: boolean
  count: number | null
}) {
  const messages = ticketMessages.create.problemSearch
  let text = count === null ? '' : messages.empty
  if (count) text = messages.results(count)
  if (isLoading) text = messages.loading
  if (isError) text = messages.error
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {text}
    </p>
  )
}

function ProblemSearchInput({
  id,
  inputRef,
  query,
  changeQuery,
  moveFocus,
  onEnter,
}: Pick<SearchState, 'inputRef' | 'query' | 'changeQuery' | 'moveFocus'> & {
  id: string
  onEnter: () => void
}) {
  const messages = ticketMessages.create.problemSearch
  return (
    <TextField
      id={id}
      label={messages.label}
      type="search"
      ref={inputRef}
      value={query}
      maxLength={160}
      autoComplete="off"
      placeholder={messages.placeholder}
      aria-describedby={`${id}-help`}
      onChange={(event) => changeQuery(event.target.value)}
      onKeyDown={(event) => {
        moveFocus(event, -1)
        if (event.key === 'Enter') {
          event.preventDefault()
          onEnter()
        }
      }}
    />
  )
}

/** Sugerencias globales con elección explícita del problema y su clasificación. */
export function TicketProblemSearch(props: TicketProblemSearchProps) {
  const { problems, isLoading, isError, onRetry, onSelect } = props
  const messages = ticketMessages.create.problemSearch
  const id = useId()
  const {
    inputRef,
    listRef,
    query,
    isOpen,
    results,
    select,
    moveFocus,
    changeQuery,
  } = useProblemSearch(problems, onSelect)
  const showResults = isOpen && Boolean(query.trim()) && !isLoading && !isError
  return (
    <div className="space-y-2">
      <ProblemSearchInput
        id={id}
        inputRef={inputRef}
        query={query}
        changeQuery={changeQuery}
        moveFocus={moveFocus}
        onEnter={() => {
          if (showResults && results[0]) select(results[0])
        }}
      />
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {messages.help}
      </p>
      <ProblemSearchStatus
        isLoading={isLoading}
        isError={isError}
        count={showResults ? results.length : null}
      />
      {isError ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onRetry}
        >
          {messages.retry}
        </Button>
      ) : null}
      {showResults && results.length > 0 ? (
        <ProblemSearchResults
          listRef={listRef}
          results={results}
          select={select}
          moveFocus={moveFocus}
        />
      ) : null}
    </div>
  )
}
