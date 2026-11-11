import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { getMunicipalError } from '../api/municipal.errors'

export function useMunicipalQuery<T>(
  permission: string,
  dependencies: () => unknown,
  fetcher: (signal: AbortSignal) => Promise<T> | null,
) {
  const auth = useAuthStore()
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const permitted = computed(() => auth.hasPermission(permission))
  let request: AbortController | undefined

  async function reload(): Promise<void> {
    request?.abort()
    data.value = null
    error.value = null
    loading.value = false
    if (!permitted.value) return
    const controller = new AbortController()
    request = controller
    try {
      const pending = fetcher(controller.signal)
      if (!pending) return
      loading.value = true
      const response = await pending
      if (!controller.signal.aborted) data.value = response
    } catch (failure) {
      const result = await getMunicipalError(failure)
      if (!controller.signal.aborted) error.value = result
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }
  watch(
    () => [dependencies(), permitted.value, auth.currentUser?.id],
    () => void reload(),
    { immediate: true, deep: true },
  )
  onScopeDispose(() => request?.abort())
  return { data, loading, error, permitted, reload }
}
