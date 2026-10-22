// Punto de entrada público del feature de autenticación.
// Otros features y las rutas solo importan desde aquí (convenciones, §4).

export { AuthProvider } from './hooks/auth-provider'
export { AuthContext, useAuth } from './hooks/auth-context'
export type { AuthContextValue } from './hooks/auth-context'
export {
  RequireAnyPermission,
  RequireAuth,
  RequirePermission,
  RequireTechnician,
} from './components/require-auth'
export { LoginForm } from './components/login-form'
export { SetupForm } from './components/setup-form'
export { ProfileForm } from './components/profile-form'
export { ChangePasswordForm } from './components/change-password-form'
export { LoadingScreen } from './components/loading-screen'
export { authMessages, roleLabel } from './i18n'
export { can, canAny } from './domain/identity'
export type { Identity } from './domain/identity'
