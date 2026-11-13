import { useAuthStore } from '@/stores/auth'
import { poaVersionsApi } from '../api/poaVersions.api'
import { useMunicipalMutation } from './usePoaActions'
export function usePoaVersionActions(
  municipalityId: number,
  poaId: number,
  writable: () => boolean,
) {
  const auth = useAuthStore()
  const mutation = useMunicipalMutation()
  return {
    ...mutation,
    create: () =>
      mutation.run(() => {
        if (!writable() || !auth.hasPermission('municipal.documents.upload'))
          throw new Error('No tienes autorización para crear versiones.')
        return poaVersionsApi.create(municipalityId, poaId)
      }),
    publish: (versionId: number) =>
      mutation.run(() => {
        if (!writable() || !auth.hasPermission('municipal.documents.publish'))
          throw new Error('No tienes autorización para publicar versiones.')
        return poaVersionsApi.publish(municipalityId, poaId, versionId)
      }),
  }
}
