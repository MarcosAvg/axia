import type { ReactNode } from 'react'
import { InfoIcon } from 'lucide-react'
import { cn } from 'cn'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Ícono de información que abre un tooltip con la explicación. */
export function HintIcon({
  hint,
  label,
  className,
}: {
  hint: string
  label: ReactNode
  className?: string
}) {
  const aria =
    typeof label === 'string' ? `Más información: ${label}` : 'Más información'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={aria}
          className={cn(
            "relative inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground outline-none after:absolute after:-inset-2.5 after:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <InfoIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}

/** Título con ayuda: el texto más un ícono de información con la explicación. */
export function HintLabel({
  label,
  hint,
  className,
}: {
  label: ReactNode
  hint?: string
  className?: string
}) {
  if (!hint) return <span className={className}>{label}</span>
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {label}
      <HintIcon hint={hint} label={label} />
    </span>
  )
}
