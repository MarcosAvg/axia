import { useAdminRows } from '../hooks/use-admin-catalog'
import { nameById } from '../domain/lookups'
import {
  useAddScopeBuilding,
  useCreateSupervisorScope,
  useDeleteSupervisorScope,
  useProfiles,
  useRemoveScopeBuilding,
  useSupervisorScopes,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'
import { SupervisorScopeForm } from './supervisor-scope-form'
import { SupervisorScopeRow } from './supervisor-scope-row'

/** Ámbitos de supervisor: equipo y edificios cubiertos. */
export function SupervisorScopes() {
  const scopes = useSupervisorScopes()
  const profiles = useProfiles()
  const teams = useAdminRows('teams')
  const buildings = useAdminRows('buildings')
  const create = useCreateSupervisorScope()
  const removeScope = useDeleteSupervisorScope()
  const addBuilding = useAddScopeBuilding()
  const removeBuilding = useRemoveScopeBuilding()
  const { list } = adminMessages

  const profileName = (id: string) =>
    profiles.data?.find((profile) => profile.id === id)?.fullName ?? '—'

  return (
    <div className="flex flex-col gap-4">
      {scopes.isLoading ? (
        <p className="text-sm text-muted-foreground">{list.loading}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {(scopes.data ?? []).map((scope) => (
            <SupervisorScopeRow
              key={scope.id}
              scope={scope}
              userName={profileName(scope.userId)}
              teamName={nameById(teams.data, scope.teamId)}
              buildings={buildings.data ?? []}
              onRemove={() => removeScope.mutate({ id: scope.id })}
              onToggleBuilding={(buildingId, checked) =>
                checked
                  ? addBuilding.mutate({ scopeId: scope.id, buildingId })
                  : removeBuilding.mutate({ scopeId: scope.id, buildingId })
              }
            />
          ))}
        </ul>
        <SupervisorScopeForm
          profiles={profiles.data ?? []}
          teams={teams.data ?? []}
          isPending={create.isPending}
          onCreate={(userId, teamId) => create.mutate({ userId, teamId })}
        />
      </div>
    </div>
  )
}
