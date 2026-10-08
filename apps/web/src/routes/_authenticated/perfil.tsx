import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  authMessages,
  LoadingScreen,
  ProfileForm,
  useAuth,
} from '@/features/auth'

export const Route = createFileRoute('/_authenticated/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { identity, isIdentityLoading } = useAuth()

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{authMessages.profile.title}</CardTitle>
        <CardDescription>{authMessages.profile.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isIdentityLoading || !identity ? (
          <LoadingScreen />
        ) : (
          <ProfileForm identity={identity} />
        )}
      </CardContent>
    </Card>
  )
}
