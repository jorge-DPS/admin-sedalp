import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import type { PaginationMeta } from '@/shared/api/types'
import { territoryApi } from '../api/territory.api'
import { getTerritoryError } from '../api/territory.errors'
import type { Municipality, MunicipalityFilters } from '../types/territory.types'

export function useMunicipalities(filters: MaybeRefOrGetter<MunicipalityFilters>) {
  const auth = useAuthStore()
  const municipalities = ref<Municipality[]>([])
  const meta = ref<PaginationMeta | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const permitted = computed(() => auth.hasPermission('municipalities.view'))
  let request: AbortController | undefined

  async function reload(): Promise<void> {
    request?.abort()
    municipalities.value = []
    meta.value = null
    error.value = null
    loading.value = false
    if (!permitted.value) return

    const controller = new AbortController()
    request = controller
    loading.value = true

    try {
      const result = await territoryApi.municipalities(toValue(filters), controller.signal)
      if (controller.signal.aborted) return
      municipalities.value = result.data
      meta.value = result.meta
    } catch (failure) {
      if (!controller.signal.aborted) error.value = getTerritoryError(failure)
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }

  watch(
    () => [toValue(filters), permitted.value, auth.currentUser?.id],
    () => void reload(),
    { immediate: true, deep: true },
  )
  onScopeDispose(() => request?.abort())

  return { municipalities, meta, loading, error, permitted, reload }
}
