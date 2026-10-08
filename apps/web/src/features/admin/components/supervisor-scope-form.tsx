import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/shared/form-fields'
import type { AdminRow } from '../api/admin-api'
import type { Profile } from '../domain/access'
import { adminMessages } from '../i18n'

interface SupervisorScopeFormProps {
  profiles: Profile[]
  teams: AdminRow[]
  isPending: boolean
  onCreate: (userId: string, teamId: string) => void
}

/** Alta de un ámbito de supervisor (usuario y equipo). */
export function SupervisorScopeForm({
  profiles,
  teams,
  isPending,
  onCreate,
}: SupervisorScopeFormProps) {
  const [userId, setUserId] = useState('')
  const [teamId, setTeamId] = useState('')
  const { scopes: t } = adminMessages

  return (
    <div className="flex flex-col gap-3">
      <SelectField
        id="scope-user"
        label={t.user}
        placeholder="Selecciona…"
        options={profiles.map((profile) => ({
          value: profile.id,
          label: profile.fullName,
        }))}
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
      />
      <SelectField
        id="scope-team"
        label={t.team}
        placeholder="Selecciona…"
        options={teams.map((team) => ({
          value: String(team.id),
          label: String(team.name),
        }))}
        value={teamId}
        onChange={(event) => setTeamId(event.target.value)}
      />
      <Button
        type="button"
        className="min-h-11 self-start"
        disabled={!userId || !teamId || isPending}
        onClick={() => onCreate(userId, teamId)}
      >
        {t.add}
      </Button>
    </div>
  )
}
