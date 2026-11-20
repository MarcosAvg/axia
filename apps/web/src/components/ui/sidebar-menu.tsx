import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

// Componentes de menú de shadcn/ui Radix Nova, adaptados al armazón de Axia.
// https://ui.shadcn.com/r/styles/radix-nova/sidebar.json
export function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn('relative flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'

  return (
    <Comp
      data-slot="sidebar-group-label"
      className={cn(
        'flex h-7 shrink-0 items-center px-3 text-xs font-medium text-sidebar-foreground/70',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  )
}

export function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn('relative', className)}
      {...props}
    />
  )
}

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}: ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string
}) {
  const Comp = asChild ? Slot.Root : 'button'
  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive || undefined}
      className={cn(
        'flex h-9 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-left text-sm text-sidebar-foreground/85 ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 [&:is([data-active],[aria-current=page])]:bg-primary/10 [&:is([data-active],[aria-current=page])]:font-semibold [&:is([data-active],[aria-current=page])]:text-primary [&>svg]:size-4 [&>svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )

  if (!tooltip) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function SidebarMenuBadge({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      className={cn(
        'pointer-events-none absolute top-1/2 right-3 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-md bg-sidebar-accent px-1 text-xs font-medium text-sidebar-accent-foreground tabular-nums select-none',
        className,
      )}
      {...props}
    />
  )
}
