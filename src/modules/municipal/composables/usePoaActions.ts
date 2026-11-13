import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { poasApi } from '../api/poas.api'
import { getMunicipalError } from '../api/municipal.errors'
import type { CreatePoaPayload, PoaFields } from '../types/poa.types'

export function useMunicipalMutation() {
  const busy = ref(false)
  const error = ref<ApiError | null>(null)
  async function run<T>(operation: () => Promise<T>): Promise<T | null> {
    if (busy.value) return null
    busy.value = true
    error.value = null
    try {
      return await operation()
    } catch (failure) {
      error.value = await getMunicipalError(failure)
      return null
    } finally {
      busy.value = false
    }
  }
  return { busy, error, run }
}

export function usePoaActions(municipalityId: number) {
  const auth = useAuthStore()
  const mutation = useMunicipalMutation()
  return {
    ...mutation,
    create: (payload: CreatePoaPayload) =>
      mutation.run(() => {
        if (!auth.hasPermission('municipal.poas.create'))
          throw new Error('No tienes permiso para registrar POA.')
        return poasApi.create(municipalityId, payload)
      }),
    update: (id: number, payload: PoaFields) =>
      mutation.run(() => {
        if (!auth.hasPermission('municipal.poas.update'))
          throw new Error('No tienes permiso para editar POA.')
        return poasApi.update(municipalityId, id, payload)
      }),
  }
}
