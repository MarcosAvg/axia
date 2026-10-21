import { ShieldCheckIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import type { Permission, Role, RolePermission, Scope } from '../domain/access'
import { useRolesController } from '../hooks/use-roles-controller'
import { adminMessages } from '../i18n'
import { RoleCreateDialog } from './role-create-dialog'
import { RoleList } from './role-list'
import { RolePanel } from './role-panel'

function RolesSidebar({
  roles,
  selectedId,
  onSelect,
  onCreate,
}: {
  roles: Role[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <RoleList roles={roles} selectedId={selectedId} onSelect={onSelect} />
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={onCreate}
      >
        {adminMessages.roles.createTitle}
      </Button>
    </div>
  )
}

interface RoleDetailProps {
  selected: Role | undefined
  creating: boolean
  permissions: Permission[]
  assignments: RolePermission[]
  isCreating: boolean
  isSaving: boolean
  onCreate: (values: { name: string; label: string }) => void
  onCancelCreate: () => void
  onSave: (values: { label: string; active: boolean }) => void
  onSet: (permissionId: string, scope: Scope) => void
  onRemove: (permissionId: string) => void
}

function RoleDetail({
  selected,
  creating,
  permissions,
  assignments,
  isCreating,
  isSaving,
  onCreate,
  onCancelCreate,
  onSave,
  onSet,
  onRemove,
}: RoleDetailProps) {
  if (creating) {
    return (
      <RoleCreateDialog
        isSaving={isCreating}
        onCreate={onCreate}
        onClose={onCancelCreate}
      />
    )
  }
  if (!selected) {
    return (
      <EmptyState icon={ShieldCheckIcon} title={adminMessages.list.empty} />
    )
  }
  return (
    <RolePanel
      role={selected}
      permissions={permissions}
      assignments={assignments}
      isSaving={isSaving}
      onSave={onSave}
      onSet={onSet}
      onRemove={onRemove}
    />
  )
}

/** Roles en master-detail: lista a la izquierda y detalle con permisos. */
export function RolesManager() {
  const controller = useRolesController()

  if (controller.isLoading) return <LoadingList rows={3} />
  if (controller.isError) {
    return <ErrorAlert message={adminMessages.list.error} />
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <RolesSidebar
        roles={controller.roleList}
        selectedId={controller.selected ? controller.selected.id : null}
        onSelect={controller.select}
        onCreate={controller.startCreate}
      />
      <RoleDetail
        selected={controller.selected}
        creating={controller.creating}
        permissions={controller.permissions}
        assignments={controller.assignments}
        isCreating={controller.isCreating}
        isSaving={controller.isSaving}
        onCreate={controller.create}
        onCancelCreate={controller.cancelCreate}
        onSave={controller.save}
        onSet={controller.setPermission}
        onRemove={controller.removePermission}
      />
    </div>
  )
}
