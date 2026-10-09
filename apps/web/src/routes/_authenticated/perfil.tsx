import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { FormSection } from '@/components/shared/form-section'
import { Badge } from '@/components/ui/badge'
import {
  LoadingScreen,
  ProfileForm,
  authMessages,
  roleLabel,
  useAuth,
} from '@/features/auth'

export const Route = createFileRoute('/_authenticated/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { identity, isIdentityLoading } = useAuth()
  const { profile } = authMessages

  if (isIdentityLoading || !identity) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6 lg:max-w-2xl">
      <PageHeader title={profile.title} description={profile.description} />
      <FormSection title={profile.sections.data}>
        <ProfileForm identity={identity} />
      </FormSection>
      <FormSection title={profile.sections.account}>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">{profile.roles}</span>
            <div className="flex flex-wrap gap-1">
              {identity.roles.length > 0 ? (
                identity.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {roleLabel(role)}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">
                  {authMessages.dashboard.noRoles}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground">{profile.timezone}</span>
            <span>{identity.timezone}</span>
          </div>
        </div>
      </FormSection>
    </div>
  )
}
