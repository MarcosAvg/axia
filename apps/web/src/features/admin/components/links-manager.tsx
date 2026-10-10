import { SelectField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import {
  useLinkRequesterUser,
  useLinkTechnicianUser,
  usePeople,
  useProfiles,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'

/** Vínculos entre cuentas y los catálogos de solicitantes y técnicos. */
export function LinksManager() {
  const people = usePeople()
  const profiles = useProfiles()
  const linkRequester = useLinkRequesterUser()
  const linkTechnician = useLinkTechnicianUser()
  const { users, list } = adminMessages

  if (people.isLoading) {
    return <p className="text-sm text-muted-foreground">{list.loading}</p>
  }

  const userOptions: SelectOption[] = [
    { value: '', label: users.noLink },
    ...(profiles.data ?? []).map((profile) => ({
      value: profile.id,
      label: profile.fullName,
    })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{users.requester}</h3>
          {(people.data?.requesters ?? []).map((person) => (
            <SelectField
              key={person.id}
              id={`requester-link-${person.id}`}
              label={person.fullName}
              options={userOptions}
              value={person.userId ?? ''}
              onChange={(event) =>
                linkRequester.mutate({
                  requesterId: person.id,
                  userId: event.target.value || null,
                })
              }
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{users.technician}</h3>
          {(people.data?.technicians ?? []).map((person) => (
            <SelectField
              key={person.id}
              id={`technician-link-${person.id}`}
              label={person.fullName}
              options={userOptions}
              value={person.userId ?? ''}
              onChange={(event) =>
                linkTechnician.mutate({
                  technicianId: person.id,
                  userId: event.target.value || null,
                })
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
