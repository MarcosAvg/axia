import { SupervisorScopes } from './supervisor-scopes'
import { TechnicianCategories } from './technician-categories'

/** Ámbitos de supervisor y designaciones de técnicos. */
export function ScopesManager() {
  return (
    <div className="flex flex-col gap-8">
      <SupervisorScopes />
      <TechnicianCategories />
    </div>
  )
}
