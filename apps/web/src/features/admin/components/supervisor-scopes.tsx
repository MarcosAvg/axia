import { useState } from 'react'
import { Building2Icon, TrashIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import type { AdminRow } from '../api/admin-api'
import type { Profile, SupervisorScope } from '../domain/access'
import { nameById } from '../domain/lookups'
import { filterSupervisorScopes } from '../domain/scope-list'
import { profilesWithRole } from '../domain/user-list'
import {
  useAddScopeBuilding,
  useCreateSupervisorScope,
  useDeleteSupervisorScope,
  useProfiles,
  useRemoveScopeBuilding,
  useRoles,
  useSupervisorScopes,
  useUserRoles,
} from '../hooks/use-access'
import { useAdminRows } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { ScopeBuildingsDialog } from './scope-buildings-dialog'
import { ScopeRemoveDialog } from './scope-remove-dialog'
import { SupervisorScopeDialog } from './supervisor-scope-dialog'

function orEmpty<T>(rows: T[] | undefined): T[] {
  return rows ?? []
}

function supervisorName(profiles: Profile[], id: string): string {
  const found = profiles.find((profile) => profile.id === id)
  return found ? found.fullName : '—'
}

function buildingLabels(rows: AdminRow[] | undefined, ids: string[]): string[] {
  return ids.map((id) => nameById(rows, id)).filter((name) => name !== '—')
}

function ScopeActions({
  name,
  onEditBuildings,
  onRemove,
}: {
  name: string
  onEditBuildings: () => void
  onRemove: () => void
}) {
  const { scopes: t } = adminMessages
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${t.editBuildings}: ${name}`}
        onClick={onEditBuildings}
      >
        <Building2Icon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${t.remove}: ${name}`}
        onClick={onRemove}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}

interface ScopeLabels {
  supervisor: (id: string) => string
  team: (id: string) => string
  buildings: (ids: string[]) => string[]
  onEdit: (scope: SupervisorScope) => void
  onRemove: (scope: SupervisorScope) => void
}

function buildScopeColumns(
  labels: ScopeLabels,
): DataTableColumn<SupervisorScope>[] {
  const { scopes: t } = adminMessages
  return [
    {
      id: 'supervisor',
      header: t.user,
      sortable: true,
      cell: (scope) => (
        <span className="font-medium">{labels.supervisor(scope.userId)}</span>
      ),
    },
    {
      id: 'team',
      header: t.team,
      cell: (scope) => labels.team(scope.teamId),
    },
    {
      id: 'buildings',
      header: t.buildings,
      cell: (scope) => {
        const names = labels.buildings(scope.buildingIds)
        return names.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-muted-foreground">{names.join(' · ')}</span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-24',
      cell: (scope) => (
        <ScopeActions
          name={labels.supervisor(scope.userId)}
          onEditBuildings={() => labels.onEdit(scope)}
          onRemove={() => labels.onRemove(scope)}
        />
      ),
    },
  ]
}

interface ScopesDialogsModel {
  creating: boolean
  onCloseCreating: () => void
  profiles: Profile[]
  teams: AdminRow[]
  isCreating: boolean
  onCreate: (userId: string, teamId: string) => void
  editing: SupervisorScope | null
  onCloseEditing: () => void
  supervisor: (id: string) => string
  team: (id: string) => string
  buildings: AdminRow[]
  onAddBuilding: (scopeId: string, buildingId: string) => void
  onRemoveBuilding: (scopeId: string, buildingId: string) => void
}

function ScopesDialogs({ model }: { model: ScopesDialogsModel }) {
  const editing = model.editing
  return (
    <>
      {model.creating ? (
        <SupervisorScopeDialog
          profiles={model.profiles}
          teams={model.teams}
          isSaving={model.isCreating}
          onCreate={model.onCreate}
          onClose={model.onCloseCreating}
        />
      ) : null}
      {editing ? (
        <ScopeBuildingsDialog
          scope={editing}
          userName={model.supervisor(editing.userId)}
          teamName={model.team(editing.teamId)}
          buildings={model.buildings}
          onToggle={(buildingId, checked) =>
            checked
              ? model.onAddBuilding(editing.id, buildingId)
              : model.onRemoveBuilding(editing.id, buildingId)
          }
          onClose={model.onCloseEditing}
        />
      ) : null}
    </>
  )
}

function useScopesController() {
  const scopes = useSupervisorScopes()
  const profiles = useProfiles()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const teams = useAdminRows('teams')
  const buildings = useAdminRows('buildings')
  const create = useCreateSupervisorScope()
  const removeScope = useDeleteSupervisorScope()
  const addBuilding = useAddScopeBuilding()
  const removeBuilding = useRemoveScopeBuilding()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SupervisorScope | null>(null)
  const [query, setQuery] = useState('')

  const profileRows = orEmpty(profiles.data)
  const supervisorProfiles =
    roles.data && userRoles.data
      ? profilesWithRole(profileRows, roles.data, userRoles.data, 'supervisor')
      : profileRows
  const supervisor = (id: string) => supervisorName(profileRows, id)
  const team = (id: string) => nameById(teams.data, id)
  const visible = filterSupervisorScopes(
    orEmpty(scopes.data),
    (scope) => `${supervisor(scope.userId)} ${team(scope.teamId)}`,
    query,
  )

  return {
    scopes,
    profiles: profileRows,
    supervisorProfiles,
    teams: orEmpty(teams.data),
    buildings: orEmpty(buildings.data),
    create,
    removeScope,
    addBuilding,
    removeBuilding,
    creating,
    setCreating,
    editing,
    setEditing,
    query,
    setQuery,
    supervisor,
    team,
    visible,
  }
}

function dialogsModel(
  c: ReturnType<typeof useScopesController>,
): ScopesDialogsModel {
  return {
    creating: c.creating,
    onCloseCreating: () => c.setCreating(false),
    profiles: c.supervisorProfiles,
    teams: c.teams,
    isCreating: c.create.isPending,
    onCreate: (userId, teamId) =>
      c.create.mutate(
        { userId, teamId },
        { onSuccess: () => c.setCreating(false) },
      ),
    editing: c.editing,
    onCloseEditing: () => c.setEditing(null),
    supervisor: c.supervisor,
    team: c.team,
    buildings: c.buildings,
    onAddBuilding: (scopeId, buildingId) =>
      c.addBuilding.mutate({ scopeId, buildingId }),
    onRemoveBuilding: (scopeId, buildingId) =>
      c.removeBuilding.mutate({ scopeId, buildingId }),
  }
}

/** Ámbitos de supervisor: equipo y edificios cubiertos. */
export function SupervisorScopes() {
  const c = useScopesController()
  const [removing, setRemoving] = useState<SupervisorScope | null>(null)
  const { scopes: t, list } = adminMessages

  return (
    <div className="flex flex-col gap-4">
      <AdminToolbar
        query={c.query}
        onQueryChange={c.setQuery}
        searchPlaceholder={t.searchScopes}
        countText={`${c.visible.length} ${list.results}`}
        addLabel={t.addSupervisor}
        onAdd={() => c.setCreating(true)}
      />
      {c.scopes.isLoading ? <LoadingList rows={3} /> : null}
      {c.scopes.isError ? <ErrorAlert message={list.error} /> : null}
      {c.scopes.data ? (
        <DataTable
          columns={buildScopeColumns({
            supervisor: c.supervisor,
            team: c.team,
            buildings: (ids) => buildingLabels(c.buildings, ids),
            onEdit: c.setEditing,
            onRemove: setRemoving,
          })}
          rows={c.visible}
          getRowId={(scope) => scope.id}
        />
      ) : null}
      <ScopesDialogs model={dialogsModel(c)} />
      <ScopeRemoveDialog
        scope={removing}
        supervisor={c.supervisor}
        team={c.team}
        isPending={c.removeScope.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          c.removeScope.mutate(
            { id: removing.id },
            { onSuccess: () => setRemoving(null) },
          )
        }}
      />
    </div>
  )
}
