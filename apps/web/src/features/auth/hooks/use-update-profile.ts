import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile } from '../api/auth-api'
import type { ProfileUpdateInput } from '../api/auth-api'

/** Guarda el perfil propio y refresca la identidad en caché. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'identity'] })
    },
  })
}
