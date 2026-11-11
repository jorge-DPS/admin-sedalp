import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { territoryApi } from '../api/territory.api'
import { getTerritoryError } from '../api/territory.errors'
import type { TerritorialCatalog, TerritoryCatalogKind } from '../types/territory.types'

export function useTerritoryCatalog(
  kind: MaybeRefOrGetter<TerritoryCatalogKind>,
  active: MaybeRefOrGetter<boolean | undefined> = undefined,
) {
  const auth = useAuthStore()
  const items = ref<TerritorialCatalog[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<ApiError | null>(null)
  const permitted = computed(() => auth.hasPermission(`${toValue(kind)}.view`))
  let request: AbortController | undefined

  async function reload(): Promise<void> {
    request?.abort()
    items.value = []
    error.value = null
    loaded.value = false
    loading.value = false
    if (!permitted.value) return

    const controller = new AbortController()
    request = controller
    loading.value = true
    const catalogKind = toValue(kind)
    const catalogActive = toValue(active)
    const collected: TerritorialCatalog[] = []

    try {
      let page = 1
      let lastPage = 1
      do {
        const result = await territoryApi[catalogKind](
          { active: catalogActive, page, per_page: 100 },
          controller.signal,
        )
        if (controller.signal.aborted) return
        collected.push(...result.data)
        lastPage = result.meta.last_page
        page += 1
      } while (page <= lastPage)

      items.value = collected
      loaded.value = true
    } catch (failure) {
      if (!controller.signal.aborted) error.value = getTerritoryError(failure)
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }

  watch(
    () => [toValue(kind), toValue(active), permitted.value, auth.currentUser?.id],
    () => void reload(),
    { immediate: true },
  )
  onScopeDispose(() => request?.abort())

  return { items, loading, loaded, error, permitted, reload }
}
