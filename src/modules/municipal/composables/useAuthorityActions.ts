import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMunicipalMutation } from './usePoaActions'
import { authoritiesApi } from '../api/authorities.api'
import type {
  AuthorityFields,
  CreateAuthorityPayload,
  MayorTransitionPayload,
  MunicipalAuthority,
} from '../types/authority.types'
export function useAuthorityActions(municipalityId: number, writable: () => boolean) {
  const auth = useAuthStore()
  const mutation = useMunicipalMutation()
  const progress = ref<number | null>(null)
  function run(permission: string, operation: () => Promise<MunicipalAuthority>) {
    return mutation.run(() => {
      if (
        !writable() ||
        !auth.hasPermission('municipal.authorities.view') ||
        !auth.hasPermission(permission)
      )
        throw new Error('No tienes autorización o el municipio no está confirmado como activo.')
      return operation()
    })
  }
  return {
    ...mutation,
    progress,
    create: (payload: CreateAuthorityPayload) =>
      run('municipal.authorities.create', () => authoritiesApi.create(municipalityId, payload)),
    update: (id: number, payload: AuthorityFields) =>
      run('municipal.authorities.update', () => authoritiesApi.update(municipalityId, id, payload)),
    publish: (id: number, published: boolean) =>
      run('municipal.authorities.publish', () =>
        authoritiesApi.publish(municipalityId, id, published),
      ),
    transition: (id: number, payload: MayorTransitionPayload) =>
      run('municipal.authorities.update', () =>
        authoritiesApi.transition(municipalityId, id, payload),
      ),
    uploadPhoto: (authority: MunicipalAuthority, file: File) =>
      run('municipal.authorities.photos.update', () => {
        if (authority.role !== 'mayor')
          throw new Error('Las fotografías se administran únicamente para alcaldes.')
        progress.value = null
        return authoritiesApi.uploadPhoto(municipalityId, authority.id, file, (event) => {
          progress.value = event.total
            ? Math.min(100, Math.round((event.loaded / event.total) * 100))
            : null
        })
      }),
  }
}
