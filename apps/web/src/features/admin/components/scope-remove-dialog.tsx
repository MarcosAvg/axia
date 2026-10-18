import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { SupervisorScope } from '../domain/access'

interface ScopeRemoveDialogProps {
  scope: SupervisorScope | null
  supervisor: (id: string) => string
  team: (id: string) => string
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Confirmación para quitar un ámbito de supervisor. */
export function ScopeRemoveDialog({
  scope,
  supervisor,
  team,
  isPending,
  onConfirm,
  onClose,
}: ScopeRemoveDialogProps) {
  if (!scope) return null
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Quitar ámbito"
      description={`${supervisor(scope.userId)} dejará de cubrir ${team(
        scope.teamId,
      )}.`}
      confirmLabel="Quitar ámbito"
      destructive
      isPending={isPending}
      onConfirm={onConfirm}
    />
  )
}
