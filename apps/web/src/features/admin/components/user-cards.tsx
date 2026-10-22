import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import type { LinkablePerson, Profile, Role, UserRole } from '../domain/access'
import { linkedPersonName, roleLabelsOf } from '../domain/user-list'
import { adminMessages } from '../i18n'
import { RowActions } from './row-actions'
import { StatusSwitch } from './status-switch'

interface UserCardActions {
  onToggleActive: (profile: Profile) => void
  onEditRoles: (profile: Profile) => void
  onResetPassword: (profile: Profile) => void
  onRevokeSessions: (profile: Profile) => void
}

export function RoleChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge key={label} variant="secondary">
          {label}
        </Badge>
      ))}
    </div>
  )
}

function linksText(
  profile: Profile,
  requesters: LinkablePerson[],
  technicians: LinkablePerson[],
): string | null {
  const names = [
    linkedPersonName(requesters, profile.id),
    linkedPersonName(technicians, profile.id),
  ].filter((name): name is string => Boolean(name))
  return names.length > 0 ? names.join(' · ') : null
}

function UserCardRoles({
  profile,
  roles,
  assignments,
}: {
  profile: Profile
  roles: Role[]
  assignments: UserRole[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <RoleChips labels={roleLabelsOf(roles, assignments, profile.id)} />
      {profile.mustChangePassword ? (
        <Badge variant="outline">
          {adminMessages.users.mustChangePassword}
        </Badge>
      ) : null}
    </div>
  )
}

function UserCard({
  profile,
  roles,
  assignments,
  requesters,
  technicians,
  onToggleActive,
  onEditRoles,
  onResetPassword,
  onRevokeSessions,
}: UserCardActions & {
  profile: Profile
  roles: Role[]
  assignments: UserRole[]
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
}) {
  const lastAccess = profile.lastLoginAt
    ? formatDateTime(profile.lastLoginAt)
    : adminMessages.users.never
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{profile.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{profile.username ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {adminMessages.users.lastAccess}: {lastAccess}
          </p>
        </div>
        <StatusSwitch
          active={profile.active}
          name={profile.fullName}
          onToggle={() => onToggleActive(profile)}
        />
      </div>
      <UserCardRoles
        profile={profile}
        roles={roles}
        assignments={assignments}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {linksText(profile, requesters, technicians) ?? '—'}
        </span>
        <RowActions
          active={profile.active}
          name={profile.fullName}
          editLabel={adminMessages.users.editRoles}
          onEdit={() => onEditRoles(profile)}
          onToggle={() => onToggleActive(profile)}
          onResetPassword={() => onResetPassword(profile)}
          onRevokeSessions={() => onRevokeSessions(profile)}
        />
      </div>
    </li>
  )
}

export function UsersCards({
  profiles,
  ...props
}: UserCardActions & {
  profiles: Profile[]
  roles: Role[]
  assignments: UserRole[]
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
}) {
  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {profiles.map((profile) => (
        <UserCard key={profile.id} profile={profile} {...props} />
      ))}
    </ul>
  )
}
