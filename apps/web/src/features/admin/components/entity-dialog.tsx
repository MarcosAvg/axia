import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/use-media-query'

interface EntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

/** Diálogo de alta/edición: modal centrado en escritorio y hoja inferior en móvil. */
export function EntityDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: EntityDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const handleOpenChange = (next: boolean) => {
    if (!next) onOpenChange(false)
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] gap-0 overflow-hidden rounded-t-xl"
      >
        <SheetHeader className="p-4 pr-8">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
