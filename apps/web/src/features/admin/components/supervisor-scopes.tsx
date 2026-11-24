import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { AdminRow } from '../api/admin-api'
import type { Profile, SupervisorScope } from '../domain/access'
import { nameById } from '../domain/lookups'
import { filterSupervisorScopes } from '../domain/scope-list'
import { profilesWithRole } from '../domain/user-list'
import {
  useCreateSupervisorScope,
  useDeleteSupervisorScope,
  useProfiles,
  useRoles,
  useSetScopeBuildings,
  useSupervisorScopes,
  useUserRoles,
} from '../hooks/use-access'
import { useAdminRows } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { ScopeRemoveDialog } from './scope-remove-dialog'
import { ScopeActions, ScopeCards } from './supervisor-scope-cards'
import type { ScopeLabels } from './supervisor-scope-cards'
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

function useScopesController() {
  const scopes = useSupervisorScopes()
  const profiles = useProfiles()
  const roles = useRoles()
  const userRoles = useUserRoles()
  const teams = useAdminRows('teams')
  const buildings = useAdminRows('buildings')
  const create = useCreateSupervisorScope()
  const removeScope = useDeleteSupervisorScope()
  const saveBuildings = useSetScopeBuildings()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SupervisorScope | null>(null)
  const [query, setQuery] = useState('')

  const profileRows = orEmpty(profiles.data)
  const supervisorProfiles = profilesWithRole(
    profileRows,
    orEmpty(roles.data),
    orEmpty(userRoles.data),
    'supervisor',
  )
  const queries = [scopes, profiles, roles, userRoles, teams, buildings]
  const supervisor = (id: string) => supervisorName(profileRows, id)
  const team = (id: string) => nameById(teams.data, id)
  const visible = filterSupervisorScopes(
    orEmpty(scopes.data),
    (scope) => `${supervisor(scope.userId)} ${team(scope.teamId)}`,
    query,
  )

  return {
    scopes,
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    ready: queries.every((query) => query.isSuccess),
    supervisorProfiles,
    teams: orEmpty(teams.data),
    buildings: orEmpty(buildings.data),
    create,
    removeScope,
    saveBuildings,
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

function ScopeEditor({
  controller: c,
}: {
  controller: ReturnType<typeof useScopesController>
}) {
  const editing = c.editing
  const { scopes: t } = adminMessages
  if (!editing && !c.creating) return null

  function close() {
    c.setCreating(false)
    c.setEditing(null)
  }

  return (
    <SupervisorScopeDialog
      profiles={c.supervisorProfiles}
      teams={c.teams}
      buildings={c.buildings}
      scopes={c.scopes.data ?? []}
      editing={editing ?? undefined}
      description={
        editing
          ? `${c.supervisor(editing.userId)} · ${c.team(editing.teamId)}`
          : t.addSupervisorHelp
      }
      isSaving={c.create.isPending || c.saveBuildings.isPending}
      onClose={close}
      onSave={(values) => {
        if (editing) {
          c.saveBuildings.mutate(
            { id: editing.id, buildingIds: values.buildingIds },
            { onSuccess: close },
          )
        } else {
          c.create.mutate(values, { onSuccess: close })
        }
      }}
    />
  )
}

/** Ámbitos de supervisor: equipo y edificios cubiertos. */
export function SupervisorScopes() {
  const c = useScopesController()
  const [removing, setRemoving] = useState<SupervisorScope | null>(null)
  const { scopes: t, list } = adminMessages
  const labels: ScopeLabels = {
    supervisor: c.supervisor,
    team: c.team,
    buildings: (ids) => buildingLabels(c.buildings, ids),
    onEdit: c.setEditing,
    onRemove: setRemoving,
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminToolbar
        query={c.query}
        onQueryChange={c.setQuery}
        searchPlaceholder={t.searchScopes}
        countText={`${c.visible.length} ${list.results}`}
        addLabel={t.addSupervisor}
        onAdd={c.ready ? () => c.setCreating(true) : undefined}
      />
      {c.isLoading ? <LoadingList rows={3} /> : null}
      {c.isError ? <ErrorAlert message={list.error} /> : null}
      {c.ready ? (
        <>
          <ScopeCards scopes={c.visible} labels={labels} />
          <div className="hidden lg:block">
            <DataTable
              columns={buildScopeColumns(labels)}
              rows={c.visible}
              getRowId={(scope) => scope.id}
            />
          </div>
        </>
      ) : null}
      <ScopeEditor controller={c} />
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
