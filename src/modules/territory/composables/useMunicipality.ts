import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { territoryApi } from '../api/territory.api'
import { getTerritoryError } from '../api/territory.errors'
import type { Municipality } from '../types/territory.types'

export function useMunicipality(id: MaybeRefOrGetter<number | null>) {
  const auth = useAuthStore()
  const municipality = ref<Municipality | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const permitted = computed(() => auth.hasPermission('municipalities.view'))
  let request: AbortController | undefined

  async function reload(): Promise<void> {
    request?.abort()
    municipality.value = null
    error.value = null
    loading.value = false
    const municipalityId = toValue(id)
    if (municipalityId === null || !permitted.value) return

    const controller = new AbortController()
    request = controller
    loading.value = true

    try {
      const result = await territoryApi.municipality(municipalityId, controller.signal)
      if (!controller.signal.aborted) municipality.value = result
    } catch (failure) {
      if (!controller.signal.aborted) error.value = getTerritoryError(failure)
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }

  watch(
    () => [toValue(id), permitted.value, auth.currentUser?.id],
    () => void reload(),
    { immediate: true },
  )
  onScopeDispose(() => request?.abort())

  return { municipality, loading, error, permitted, reload }
}
