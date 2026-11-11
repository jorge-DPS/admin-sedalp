import {
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { territoryApi } from '../api/territory.api'
import { getTerritoryError } from '../api/territory.errors'

export function useRegionProvinces(regionId: MaybeRefOrGetter<number | null>) {
  const auth = useAuthStore()
  const ids = shallowRef<Set<number> | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const permitted = computed(
    () => auth.hasPermission('municipalities.view') && auth.hasPermission('provinces.view'),
  )
  const cache = new Map<number, Set<number>>()
  let request: AbortController | undefined

  async function reload(): Promise<void> {
    request?.abort()
    ids.value = null
    error.value = null
    loading.value = false
    const region = toValue(regionId)
    if (region === null) return
    if (!permitted.value) {
      error.value = {
        status: 403,
        errors: {},
        message:
          'Se necesitan permisos de provincias y municipios para relacionar las provincias con la región.',
      }
      return
    }
    const cached = cache.get(region)
    if (cached) {
      ids.value = cached
      return
    }
    const controller = new AbortController()
    request = controller
    loading.value = true
    try {
      const related = new Set<number>()
      let page = 1
      let lastPage = 1
      do {
        const response = await territoryApi.municipalities(
          { region_id: region, per_page: 100, page },
          controller.signal,
        )
        if (controller.signal.aborted) return
        response.data.forEach((municipality) => related.add(municipality.province_id))
        lastPage = response.meta.last_page
        page += 1
      } while (page <= lastPage)
      cache.set(region, related)
      ids.value = related
    } catch (failure) {
      if (!controller.signal.aborted) error.value = getTerritoryError(failure)
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }
  watch(
    () => [auth.currentUser?.id, permitted.value],
    () => cache.clear(),
    { flush: 'sync' },
  )
  watch(
    () => [toValue(regionId), auth.currentUser?.id, permitted.value],
    () => void reload(),
    { immediate: true, flush: 'sync' },
  )
  onScopeDispose(() => {
    request?.abort()
    cache.clear()
  })
  return { ids, loading, error, reload }
}
